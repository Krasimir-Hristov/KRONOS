import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  DOCUMENT_SELECT_COLUMNS,
  mapRowToCatalogItem,
} from '@/features/documents/server';
import type { CatalogDocumentItem } from '@/features/documents';
import { generateTextEmbedding } from '@/lib/ai/embeddingService';
import { redactSecretsFromFreeText } from '@/lib/security/secretFactGuard';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

export interface HybridSearchInput {
  readonly query: string;
  readonly topic?: string | null;
  readonly docType?: string | null;
  readonly dateFrom?: string | null;
  readonly dateTo?: string | null;
  readonly limit?: number;
  readonly useVector?: boolean;
}

export interface HybridSearchOutcome {
  readonly items: readonly CatalogDocumentItem[];
  readonly usedVector: boolean;
}

const DEFAULT_HYBRID_LIMIT = 30;

export const loadCatalogDocumentsByIds = async (
  ids: readonly string[]
): Promise<ReadonlyMap<string, CatalogDocumentItem>> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT_COLUMNS)
      .eq('owner_id', userId)
      .in('id', uniqueIds);

    if (error) {
      throw new Error('Неуспешно зареждане на документите от сейфа.');
    }

    return new Map((data ?? []).map((row) => [row.id, mapRowToCatalogItem(row)]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при зареждане на документи.';
    throw new Error(msg, { cause: err });
  }
};

const CHAT_QUERY_EMBEDDING_TIMEOUT_MS = 2_000;

const tryGenerateQueryEmbedding = async (query: string): Promise<string | null> => {
  const cleaned = redactSecretsFromFreeText(query).trim();
  if (!cleaned) {
    return null;
  }
  try {
    return await generateTextEmbedding(cleaned, undefined, CHAT_QUERY_EMBEDDING_TIMEOUT_MS);
  } catch {
    // Graceful degradation: Full-Text + trigram search still works without a vector.
    return null;
  }
};

export const searchDocumentsHybridRag = async (
  input: HybridSearchInput
): Promise<HybridSearchOutcome> => {
  try {
    await requireAuthAndPin({ redirectOnFail: false });
    const query = input.query.trim().slice(0, 300);
    const embedding =
      input.useVector === false ? null : await tryGenerateQueryEmbedding(query);
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('search_documents_hybrid', {
      p_query: query,
      p_query_embedding: embedding ?? undefined,
      p_topic: input.topic || undefined,
      p_doc_type: input.docType || undefined,
      p_date_from: input.dateFrom || undefined,
      p_date_to: input.dateTo || undefined,
      p_limit: input.limit ?? DEFAULT_HYBRID_LIMIT,
    });

    if (error) {
      throw new Error('Неуспешно търсене в документния сейф.');
    }

    return {
      items: (data ?? []).map(mapRowToCatalogItem),
      usedVector: embedding !== null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при търсене в сейфа.';
    throw new Error(msg, { cause: err });
  }
};

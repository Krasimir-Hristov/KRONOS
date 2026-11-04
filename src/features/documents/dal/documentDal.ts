import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';
import {
  classicDocumentSearchSchema,
  documentReviewMetaSchema,
  documentTopicSchema,
  documentTypeSchema,
  type CatalogDocumentItem,
  type ClassicDocumentSearchInput,
} from '../schemas/documentSchema';

export const DOCUMENT_SELECT_COLUMNS =
  'id, title, topic, doc_type, sender, doc_date, expires_at, storage_path, original_file_name, mime_type, file_size_bytes, summary_text, metadata, processing_status, created_at, updated_at' as const;

export const mapRowToCatalogItem = (row: {
  readonly id: string;
  readonly title: string;
  readonly topic: string;
  readonly doc_type: string;
  readonly sender: string;
  readonly doc_date: string | null;
  readonly expires_at: string | null;
  readonly storage_path: string;
  readonly original_file_name: string;
  readonly mime_type: string;
  readonly file_size_bytes: number;
  readonly summary_text: string;
  readonly metadata: Json;
  readonly processing_status: string;
  readonly created_at: string;
  readonly updated_at: string;
}): CatalogDocumentItem => {
  const parsedTopic = documentTopicSchema.safeParse(row.topic);
  const parsedType = documentTypeSchema.safeParse(row.doc_type);
  const parsedMeta = documentReviewMetaSchema.safeParse(row.metadata ?? {});

  return {
    id: row.id,
    title: row.title,
    topic: parsedTopic.success ? parsedTopic.data : 'allgemein',
    docType: parsedType.success ? parsedType.data : 'sonstiges',
    sender: row.sender,
    docDate: row.doc_date,
    expiresAt: row.expires_at,
    storagePath: row.storage_path,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    summaryText: row.summary_text,
    processingStatus: row.processing_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewMeta: parsedMeta.success
      ? parsedMeta.data
      : { pendingReview: false, suggestedFacts: [] },
  };
};

export const searchCatalogDocumentsClassic = async (
  rawInput: ClassicDocumentSearchInput
): Promise<readonly CatalogDocumentItem[]> => {
  try {
    await requireAuthAndPin({ redirectOnFail: false });
    const validated = classicDocumentSearchSchema.parse(rawInput);
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('search_documents_classic', {
      p_query: validated.query,
      p_topic: validated.topic || undefined,
      p_doc_type: validated.docType || undefined,
      p_only_approved: true,
      p_sort_by: validated.sortBy,
      p_limit: validated.limit,
      p_offset: validated.offset,
    });

    if (error) {
      throw new Error('Неуспешно класическо търсене в сейфа.');
    }

    return (data ?? []).map(mapRowToCatalogItem);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при търсене на документи.';
    throw new Error(msg, { cause: err });
  }
};

export const listReviewQueueDocuments = async (): Promise<
  readonly CatalogDocumentItem[]
> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT_COLUMNS)
      .eq('owner_id', userId)
      .eq('metadata->>pendingReview', 'true')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error('Неуспешно зареждане на опашката за одобрение.');
    }

    return (data ?? [])
      .map(mapRowToCatalogItem)
      .filter((doc) => doc.reviewMeta.pendingReview);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при зареждане на опашката.';
    throw new Error(msg, { cause: err });
  }
};

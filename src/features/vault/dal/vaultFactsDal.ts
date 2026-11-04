import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';
import {
  extractedFactCandidateSchema,
  vaultCategorySchema,
  vaultFactInputSchema,
  vaultFactUpdateSchema,
  type ExtractedFactCandidate,
  type VaultFactInput,
  type VaultFactItem,
  type VaultFactUpdateInput,
} from '../schemas/vaultSchema';

interface JoinedSourceDoc {
  readonly id: string;
  readonly title: string;
  readonly doc_date: string | null;
}

const extractJoinedDoc = (raw: unknown): JoinedSourceDoc | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = Array.isArray(raw) ? (raw[0] as unknown) : raw;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  const obj = candidate as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') {
    return null;
  }
  return {
    id: obj.id,
    title: obj.title,
    doc_date: typeof obj.doc_date === 'string' ? obj.doc_date : null,
  };
};

export const listVaultFacts = async (): Promise<readonly VaultFactItem[]> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('vault_items')
      .select(
        'id, category, label, value_plain, username_or_hint, source_document_id, updated_at, documents ( id, title, doc_date )'
      )
      .eq('owner_id', userId)
      .eq('is_secret', false)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error('Неуспешно зареждане на личните данни от сейфа.');
    }

    return (data ?? []).map((row) => {
      const catParsed = vaultCategorySchema.safeParse(row.category);
      const joinedDoc = extractJoinedDoc(row.documents);
      return {
        id: row.id,
        category: catParsed.success ? catParsed.data : 'other',
        label: row.label,
        valuePlain: row.value_plain ?? '',
        usernameOrHint: row.username_or_hint,
        sourceDocumentId: row.source_document_id,
        sourceDocumentTitle: joinedDoc?.title ?? null,
        sourceDocumentDate: joinedDoc?.doc_date ?? null,
        updatedAt: row.updated_at,
      };
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при четене на личните данни.';
    throw new Error(msg, { cause: err });
  }
};

export const createVaultFact = async (input: VaultFactInput): Promise<string> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = vaultFactInputSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    if (validated.sourceDocumentId) {
      const { data: ownedDoc, error: docErr } = await supabase
        .from('documents')
        .select('id')
        .eq('id', validated.sourceDocumentId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (docErr || !ownedDoc) {
        throw new Error('Изходният документ не е намерен или нямате права за него.');
      }
    }

    const { data, error } = await supabase
      .from('vault_items')
      .insert({
        owner_id: userId,
        category: validated.category,
        label: validated.label,
        value_plain: validated.value,
        value_encrypted: null,
        is_secret: false,
        username_or_hint: validated.usernameOrHint ?? null,
        source_document_id: validated.sourceDocumentId ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Неуспешен запис на новия факт.');
    }

    return data.id;
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при добавяне на личен факт.';
    throw new Error(msg, { cause: err });
  }
};

export const updateVaultFact = async (input: VaultFactUpdateInput): Promise<void> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = vaultFactUpdateSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('vault_items')
      .update({
        category: validated.category,
        label: validated.label,
        value_plain: validated.value,
        username_or_hint: validated.usernameOrHint ?? null,
      })
      .eq('id', validated.id)
      .eq('owner_id', userId)
      .eq('is_secret', false)
      .select('id');

    if (error || !data || data.length === 0) {
      throw new Error('Неуспешна промяна на записа.');
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при редакция на личен факт.';
    throw new Error(msg, { cause: err });
  }
};

export const purgeVaultFact = async (factId: string): Promise<void> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('vault_items')
      .delete()
      .eq('id', factId)
      .eq('owner_id', userId)
      .eq('is_secret', false);

    if (error) {
      throw new Error('Неуспешно физическо изтриване на записа.');
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при изтриване на личен факт.';
    throw new Error(msg, { cause: err });
  }
};

export const saveApprovedFactsDeduplicated = async (
  sourceDocumentId: string,
  rawCandidates: readonly ExtractedFactCandidate[]
): Promise<{ readonly insertedCount: number; readonly skippedDuplicates: number }> => {
  try {
    await requireAuthAndPin({ redirectOnFail: false });
    if (rawCandidates.length === 0) {
      return { insertedCount: 0, skippedDuplicates: 0 };
    }

    const validCandidates: Json[] = [];
    for (const item of rawCandidates) {
      const parsed = extractedFactCandidateSchema.safeParse(item);
      if (parsed.success) {
        validCandidates.push({
          label: parsed.data.label,
          value: parsed.data.value,
          category: parsed.data.category,
          hint: parsed.data.hint ?? null,
        });
      }
    }

    if (validCandidates.length === 0) {
      return { insertedCount: 0, skippedDuplicates: 0 };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('save_deduplicated_vault_facts', {
      p_source_document_id: sourceDocumentId,
      p_candidates: validCandidates,
    });

    if (error) {
      throw new Error('Грешка при запис на одобрените факти в сейфа.');
    }

    const row = Array.isArray(data) ? data[0] : undefined;
    return {
      insertedCount: row?.inserted_count ?? 0,
      skippedDuplicates: row?.skipped_duplicates ?? 0,
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при запис на одобрени факти.';
    throw new Error(msg, { cause: err });
  }
};

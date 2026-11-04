import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  areFactsDuplicate,
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

    const { error } = await supabase
      .from('vault_items')
      .update({
        category: validated.category,
        label: validated.label,
        value_plain: validated.value,
        username_or_hint: validated.usernameOrHint ?? null,
      })
      .eq('id', validated.id)
      .eq('owner_id', userId)
      .eq('is_secret', false);

    if (error) {
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
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    if (rawCandidates.length === 0) {
      return { insertedCount: 0, skippedDuplicates: 0 };
    }

    const supabase = await createServerSupabaseClient();
    const { data: existingRows, error: loadErr } = await supabase
      .from('vault_items')
      .select('id, label, value_plain, source_document_id')
      .eq('owner_id', userId)
      .eq('is_secret', false);

    if (loadErr) {
      throw new Error('Грешка при проверка за дублирани факти.');
    }

    const knownFacts: Array<{ id?: string; label: string; value: string; sourceDocId: string | null }> =
      (existingRows ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        value: r.value_plain ?? '',
        sourceDocId: r.source_document_id,
      }));

    let insertedCount = 0;
    let skippedDuplicates = 0;

    for (const item of rawCandidates) {
      const parsed = extractedFactCandidateSchema.safeParse(item);
      if (!parsed.success) {
        continue;
      }

      const candidate = parsed.data;
      const matchingExisting = knownFacts.find((existing) =>
        areFactsDuplicate(existing, { label: candidate.label, value: candidate.value })
      );

      if (matchingExisting) {
        skippedDuplicates += 1;
        if (matchingExisting.id && !matchingExisting.sourceDocId) {
          await supabase
            .from('vault_items')
            .update({ source_document_id: sourceDocumentId })
            .eq('id', matchingExisting.id)
            .eq('owner_id', userId);
          matchingExisting.sourceDocId = sourceDocumentId;
        }
        continue;
      }

      const { error: insertErr } = await supabase.from('vault_items').insert({
        owner_id: userId,
        category: candidate.category,
        label: candidate.label,
        value_plain: candidate.value,
        value_encrypted: null,
        is_secret: false,
        username_or_hint: candidate.hint ?? null,
        source_document_id: sourceDocumentId,
      });

      if (!insertErr) {
        insertedCount += 1;
        knownFacts.push({
          label: candidate.label,
          value: candidate.value,
          sourceDocId: sourceDocumentId,
        });
      }
    }

    return { insertedCount, skippedDuplicates };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при запис на одобрени факти.';
    throw new Error(msg, { cause: err });
  }
};

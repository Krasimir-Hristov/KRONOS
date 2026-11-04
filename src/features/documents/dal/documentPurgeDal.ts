import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  commitStagedVaultPurge,
  restoreStagedVaultObjects,
  stageVaultObjectsForPurge,
} from '@/features/storage/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

export const purgeDocumentsHard = async (
  documentIds: readonly string[]
): Promise<{ readonly purgedCount: number }> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    if (documentIds.length === 0) {
      return { purgedCount: 0 };
    }

    const supabase = await createServerSupabaseClient();
    const { data: rows, error: selectErr } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)
      .in('id', [...documentIds]);

    if (selectErr) {
      throw new Error('Грешка при проверка на документите преди изтриване.');
    }

    if (!rows || rows.length === 0) {
      return { purgedCount: 0 };
    }

    const rowIds = rows.map((r) => r.id);
    const { data: linkedFacts } = await supabase
      .from('vault_items')
      .select('id, source_document_id')
      .eq('owner_id', userId)
      .in('source_document_id', rowIds);

    // Step 1: Stage Storage objects into owner-scoped .purge_stage (auto-compensates on partial error)
    const stagedObjects = await stageVaultObjectsForPurge(
      rows.map((r) => r.storage_path)
    );

    // Step 2: Delete DB rows; if DB delete fails, move staged Storage files back to original paths
    const { data: deletedRows, error: deleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('owner_id', userId)
      .in('id', rowIds)
      .select('id');

    if (deleteErr || !deletedRows) {
      await restoreStagedVaultObjects(stagedObjects);
      throw new Error('Грешка при физическо заличаване от базата данни.');
    }

    // Step 3: Permanently remove staged Storage objects; if Storage commit fails, restore both Storage & DB
    try {
      await commitStagedVaultPurge(stagedObjects);
    } catch (storageCommitErr) {
      await restoreStagedVaultObjects(stagedObjects);
      await supabase.from('documents').insert(rows);
      if (linkedFacts && linkedFacts.length > 0) {
        for (const fact of linkedFacts) {
          if (fact.source_document_id) {
            await supabase
              .from('vault_items')
              .update({ source_document_id: fact.source_document_id })
              .eq('id', fact.id)
              .eq('owner_id', userId);
          }
        }
      }
      throw storageCommitErr;
    }

    return { purgedCount: deletedRows.length };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при Hard Purge на документите.';
    throw new Error(msg, { cause: err });
  }
};

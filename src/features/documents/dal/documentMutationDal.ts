import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { purgeVaultStorageObjects } from '@/features/storage/server';
import { saveApprovedFactsDeduplicated } from '@/features/vault/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';
import {
  approveDocumentsBatchSchema,
  registerPendingDocumentSchema,
  updateDocumentMetaSchema,
  type ApproveDocumentItemInput,
  type CatalogDocumentItem,
  type RegisterPendingDocumentInput,
  type UpdateDocumentMetaInput,
} from '../schemas/documentSchema';
import { DOCUMENT_SELECT_COLUMNS, mapRowToCatalogItem } from './documentDal';

export const registerPendingDocument = async (
  input: RegisterPendingDocumentInput,
  options: { readonly autoApprove?: boolean; readonly customTitle?: string } = {}
): Promise<CatalogDocumentItem> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = registerPendingDocumentSchema.parse(input);

    if (!validated.storagePath.startsWith(`${userId}/`)) {
      throw new Error('Неоторизиран път към файла в сториджа.');
    }

    const fallbackTitle =
      options.customTitle?.trim() ||
      validated.originalFileName.replace(/\.[^.]+$/, '').slice(0, 160) ||
      'Нов документ';

    const reviewMeta: Json = {
      pendingReview: options.autoApprove ? false : true,
      suggestedFacts: [],
      aiError: null,
    };

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        owner_id: userId,
        title: fallbackTitle,
        topic: 'allgemein',
        doc_type: 'sonstiges',
        sender: '',
        storage_path: validated.storagePath,
        original_file_name: validated.originalFileName,
        mime_type: validated.mimeType,
        file_size_bytes: validated.fileSizeBytes,
        processing_status: options.autoApprove ? 'completed' : 'pending',
        metadata: reviewMeta,
      })
      .select(DOCUMENT_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error('Неуспешно регистриране на документа в базата данни.');
    }

    return mapRowToCatalogItem(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при запис на нов документ.';
    throw new Error(msg, { cause: err });
  }
};

export const approveDocumentsBatch = async (
  items: readonly ApproveDocumentItemInput[]
): Promise<{ readonly approvedCount: number; readonly savedFactsCount: number }> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = approveDocumentsBatchSchema.parse({ items });
    const supabase = await createServerSupabaseClient();

    let approvedCount = 0;
    let savedFactsCount = 0;

    for (const item of validated.items) {
      const cleanMeta: Json = {
        pendingReview: false,
        suggestedFacts: [],
        aiError: null,
      };

      const { error } = await supabase
        .from('documents')
        .update({
          title: item.title,
          topic: item.topic,
          doc_type: item.docType,
          sender: item.sender,
          doc_date: item.docDate,
          expires_at: item.expiresAt,
          processing_status: 'completed',
          metadata: cleanMeta,
        })
        .eq('id', item.id)
        .eq('owner_id', userId);

      if (!error) {
        approvedCount += 1;
        if (item.selectedFacts.length > 0) {
          const dedupRes = await saveApprovedFactsDeduplicated(
            item.id,
            item.selectedFacts
          );
          savedFactsCount += dedupRes.insertedCount;
        }
      }
    }

    return { approvedCount, savedFactsCount };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при одобряване на документите.';
    throw new Error(msg, { cause: err });
  }
};

export const updateApprovedDocumentMetadata = async (
  input: UpdateDocumentMetaInput
): Promise<void> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = updateDocumentMetaSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('documents')
      .update({
        title: validated.title,
        topic: validated.topic,
        doc_type: validated.docType,
        sender: validated.sender,
        doc_date: validated.docDate,
        expires_at: validated.expiresAt,
      })
      .eq('id', validated.id)
      .eq('owner_id', userId);

    if (error) {
      throw new Error('Неуспешно обновяване на метаданните на документа.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при редакция на документа.';
    throw new Error(msg, { cause: err });
  }
};

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
      .select('id, storage_path')
      .eq('owner_id', userId)
      .in('id', [...documentIds]);

    if (selectErr) {
      throw new Error('Грешка при проверка на документите преди изтриване.');
    }

    if (!rows || rows.length === 0) {
      return { purgedCount: 0 };
    }

    await purgeVaultStorageObjects(rows.map((r) => r.storage_path));

    const { error: deleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('owner_id', userId)
      .in(
        'id',
        rows.map((r) => r.id)
      );

    if (deleteErr) {
      throw new Error('Грешка при физическо заличаване от базата данни.');
    }

    return { purgedCount: rows.length };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при Hard Purge на документите.';
    throw new Error(msg, { cause: err });
  }
};

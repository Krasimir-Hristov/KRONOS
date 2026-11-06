import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { getVaultObjectMetadata } from '@/features/storage/server';
import { saveApprovedFactsDeduplicated } from '@/features/vault/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';
import {
  approveDocumentsBatchSchema,
  patchDocumentMetaSchema,
  registerPendingDocumentSchema,
  type ApproveDocumentItemInput,
  type CatalogDocumentItem,
  type PatchDocumentMetaInput,
  type RegisterPendingDocumentInput,
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

    const storedObject = await getVaultObjectMetadata(validated.storagePath);
    if (
      storedObject.sizeBytes !== validated.fileSizeBytes ||
      storedObject.mimeType !== validated.mimeType
    ) {
      throw new Error(
        'Метаданните на качения файл не съответстват на обекта в хранилището.'
      );
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
      const { data: ownedDoc, error: ownerErr } = await supabase
        .from('documents')
        .select('id')
        .eq('id', item.id)
        .eq('owner_id', userId)
        .maybeSingle();

      if (ownerErr) {
        throw new Error('Грешка при проверка на собствеността върху документа.');
      }

      if (!ownedDoc) {
        continue;
      }

      let itemInsertedFacts = 0;
      if (item.selectedFacts.length > 0) {
        const dedupRes = await saveApprovedFactsDeduplicated(
          item.id,
          item.selectedFacts
        );
        itemInsertedFacts = dedupRes.insertedCount;
      }

      const cleanMeta: Json = {
        pendingReview: false,
        suggestedFacts: [],
        aiError: null,
      };

      const { data: updatedRows, error: updateErr } = await supabase
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
        .eq('owner_id', userId)
        .select('id');

      if (updateErr) {
        throw new Error('Грешка при финализиране на одобрението на документа.');
      }

      if (updatedRows && updatedRows.length > 0) {
        approvedCount += 1;
        savedFactsCount += itemInsertedFacts;
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
  input: PatchDocumentMetaInput
): Promise<void> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = patchDocumentMetaSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const dbPatch: {
      title?: string;
      topic?: string;
      doc_type?: string;
      sender?: string;
      doc_date?: string | null;
      expires_at?: string | null;
    } = {};

    if (validated.title !== undefined) dbPatch.title = validated.title;
    if (validated.topic !== undefined) dbPatch.topic = validated.topic;
    if (validated.docType !== undefined) dbPatch.doc_type = validated.docType;
    if (validated.sender !== undefined) dbPatch.sender = validated.sender;
    if (validated.docDate !== undefined) dbPatch.doc_date = validated.docDate;
    if (validated.expiresAt !== undefined) dbPatch.expires_at = validated.expiresAt;

    const { data, error } = await supabase
      .from('documents')
      .update(dbPatch)
      .eq('id', validated.id)
      .eq('owner_id', userId)
      .select('id');

    if (error || !data || data.length === 0) {
      throw new Error('Неуспешно обновяване на метаданните на документа.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при редакция на документа.';
    throw new Error(msg, { cause: err });
  }
};

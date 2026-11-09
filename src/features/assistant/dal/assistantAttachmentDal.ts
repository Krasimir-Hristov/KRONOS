import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  processQueuedDocumentOcrAndRag,
  registerPendingDocument,
} from '@/features/documents/server';
import { isTextOrOfficeMimeType } from '@/features/ingestion/server';
import { sanitizeFileNameSlug } from '@/features/storage';
import {
  createVaultSignedDownloadUrl,
  downloadVaultObjectBytes,
  getVaultObjectMetadata,
  purgeVaultStorageObjects,
} from '@/features/storage/server';
import type { OcrDocumentInput } from '@/lib/ai/documentOcrService';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { ChatAttachmentInput } from '../schemas/assistantSchema';

const INLINE_VISION_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface SavedAttachmentResult {
  readonly documentId: string;
  readonly title: string;
  readonly aiError: string | null;
  readonly alreadyExisted: boolean;
}

const assertOwnedPath = async (storagePath: string): Promise<string> => {
  const { userId } = await requireAuthAndPin({ redirectOnFail: false });
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('Неоторизиран път към прикачения файл.');
  }
  return userId;
};

export const saveAttachmentToVault = async (
  attachment: ChatAttachmentInput
): Promise<SavedAttachmentResult> => {
  try {
    const userId = await assertOwnedPath(attachment.storagePath);
    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from('documents')
      .select('id, title')
      .eq('owner_id', userId)
      .eq('storage_path', attachment.storagePath)
      .maybeSingle();

    if (existing) {
      return {
        documentId: existing.id,
        title: existing.title,
        aiError: null,
        alreadyExisted: true,
      };
    }

    const registered = await registerPendingDocument({
      storagePath: attachment.storagePath,
      originalFileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes,
    });
    const outcome = await processQueuedDocumentOcrAndRag(registered.id);

    const { data: refreshed } = await supabase
      .from('documents')
      .select('title')
      .eq('id', registered.id)
      .eq('owner_id', userId)
      .maybeSingle();

    return {
      documentId: registered.id,
      title: refreshed?.title ?? registered.title,
      aiError: outcome.aiError,
      alreadyExisted: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при запис на прикачения документ.';
    throw new Error(msg, { cause: err });
  }
};

export const buildVisionSourceFromAttachment = async (
  attachment: ChatAttachmentInput
): Promise<OcrDocumentInput> => {
  try {
    await assertOwnedPath(attachment.storagePath);
    const expectedSuffix = `-${sanitizeFileNameSlug(attachment.fileName)}`;
    if (!attachment.storagePath.endsWith(expectedSuffix)) {
      throw new Error('Името на прикачения файл не съответства на пътя в хранилището.');
    }

    const storedObject = await getVaultObjectMetadata(attachment.storagePath);
    if (
      storedObject.sizeBytes !== attachment.fileSizeBytes ||
      storedObject.mimeType !== attachment.mimeType
    ) {
      throw new Error(
        'Метаданните на прикачения файл не съответстват на обекта в хранилището.'
      );
    }

    const needsBytes =
      attachment.fileSizeBytes <= INLINE_VISION_MAX_BYTES ||
      isTextOrOfficeMimeType(attachment.mimeType);

    if (needsBytes) {
      const { bytes } = await downloadVaultObjectBytes(attachment.storagePath);
      return { fileName: attachment.fileName, mimeType: attachment.mimeType, bytes };
    }
    const { signedUrl } = await createVaultSignedDownloadUrl(attachment.storagePath, 120);
    return { fileName: attachment.fileName, mimeType: attachment.mimeType, signedUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Неуспешно четене на прикачения файл.';
    throw new Error(msg, { cause: err });
  }
};

/** Hard Purge of a chat attachment that was analysed but not saved into the RAG vault. */
export const cleanupTemporaryAttachment = async (storagePath: string): Promise<void> => {
  try {
    const userId = await assertOwnedPath(storagePath);
    const supabase = await createServerSupabaseClient();
    const { data: linked, error } = await supabase
      .from('documents')
      .select('id')
      .eq('owner_id', userId)
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (error) {
      throw new Error('Неуспешна проверка на привързаност за прикачения файл.', {
        cause: error,
      });
    }

    if (!linked) {
      await purgeVaultStorageObjects([storagePath]);
    }
  } catch (err) {
    console.error('[AssistantAttachmentDal] cleanupTemporaryAttachment failed:', err);
  }
};

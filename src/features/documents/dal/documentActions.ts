'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createVaultSignedDownloadUrl,
  createVaultSignedUploadUrl,
} from '@/features/storage/server';
import { storageUploadRequestSchema } from '@/features/storage';
import {
  approveDocumentsBatchSchema,
  classicDocumentSearchSchema,
  registerPendingDocumentSchema,
  updateDocumentMetaSchema,
  type CatalogDocumentItem,
} from '../schemas/documentSchema';
import {
  listReviewQueueDocuments,
  searchCatalogDocumentsClassic,
} from './documentDal';
import {
  approveDocumentsBatch,
  purgeDocumentsHard,
  registerPendingDocument,
  updateApprovedDocumentMetadata,
} from './documentMutationDal';
import {
  processQueuedDocumentOcrAndRag,
  type ProcessDocumentAiOutcome,
} from './documentAiProcessorDal';

export type DocumentActionResponse<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errorMessage: string };

const idSchema = z.object({ id: z.string().uuid() });
const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });
const storagePathSchema = z.object({ storagePath: z.string().min(5).max(500) });

export const requestDocumentUploadUrlAction = async (
  rawInput: unknown
): Promise<
  DocumentActionResponse<{
    readonly storagePath: string;
    readonly signedUrl: string;
    readonly token: string;
  }>
> => {
  try {
    const parsed = storageUploadRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалиден файл за качване.',
      };
    }
    const signed = await createVaultSignedUploadUrl(parsed.data);
    return { ok: true, data: signed };
  } catch (err) {
    return {
      ok: false,
      errorMessage:
        err instanceof Error ? err.message : 'Неуспешна подготовка за качване.',
    };
  }
};

export const registerUploadedDocumentAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<CatalogDocumentItem>> => {
  try {
    const extendedSchema = registerPendingDocumentSchema.extend({
      autoApprove: z.boolean().optional(),
      customTitle: z.string().max(200).optional(),
    });
    const parsed = extendedSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни данни за документа.',
      };
    }
    const created = await registerPendingDocument(parsed.data, {
      autoApprove: parsed.data.autoApprove,
      customTitle: parsed.data.customTitle,
    });
    revalidatePath('/documents');
    return { ok: true, data: created };
  } catch (err) {
    return {
      ok: false,
      errorMessage:
        err instanceof Error ? err.message : 'Грешка при регистриране на документа.',
    };
  }
};

export const processDocumentOcrAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<ProcessDocumentAiOutcome>> => {
  try {
    const parsed = idSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден идентификатор на документ.' };
    }
    const outcome = await processQueuedDocumentOcrAndRag(parsed.data.id);
    revalidatePath('/documents');
    return { ok: true, data: outcome };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Грешка при OCR обработка.',
    };
  }
};

export const searchDocumentsClassicAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<readonly CatalogDocumentItem[]>> => {
  try {
    const parsed = classicDocumentSearchSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалидни параметри за търсене.' };
    }
    const items = await searchCatalogDocumentsClassic(parsed.data);
    return { ok: true, data: items };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Грешка при търсене.',
    };
  }
};

export const fetchReviewQueueAction = async (): Promise<
  DocumentActionResponse<readonly CatalogDocumentItem[]>
> => {
  try {
    const items = await listReviewQueueDocuments();
    return { ok: true, data: items };
  } catch (err) {
    return {
      ok: false,
      errorMessage:
        err instanceof Error ? err.message : 'Грешка при зареждане на опашката.',
    };
  }
};

export const approveDocumentsBatchAction = async (
  rawInput: unknown
): Promise<
  DocumentActionResponse<{
    readonly approvedCount: number;
    readonly savedFactsCount: number;
  }>
> => {
  try {
    const parsed = approveDocumentsBatchSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage:
          parsed.error.issues[0]?.message ?? 'Невалидни данни за одобрение.',
      };
    }
    const res = await approveDocumentsBatch(parsed.data.items);
    revalidatePath('/documents');
    revalidatePath('/vault');
    return { ok: true, data: res };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Грешка при одобрение.',
    };
  }
};

export const updateDocumentMetaAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<null>> => {
  try {
    const parsed = updateDocumentMetaSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни метаданни.',
      };
    }
    await updateApprovedDocumentMetadata(parsed.data);
    revalidatePath('/documents');
    return { ok: true, data: null };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Грешка при редакция.',
    };
  }
};

export const getDocumentSignedUrlAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<{ readonly signedUrl: string }>> => {
  try {
    const parsed = storagePathSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден път към файла.' };
    }
    const res = await createVaultSignedDownloadUrl(parsed.data.storagePath, 1800);
    return { ok: true, data: res };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Грешка при линк за преглед.',
    };
  }
};

export const purgeDocumentsAction = async (
  rawInput: unknown
): Promise<DocumentActionResponse<{ readonly purgedCount: number }>> => {
  try {
    const parsed = idsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Изберете поне един документ за изтриване.' };
    }
    const res = await purgeDocumentsHard(parsed.data.ids);
    revalidatePath('/documents');
    revalidatePath('/vault');
    return { ok: true, data: res };
  } catch (err) {
    return {
      ok: false,
      errorMessage:
        err instanceof Error ? err.message : 'Грешка при физическо изтриване.',
    };
  }
};

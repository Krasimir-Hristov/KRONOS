'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  uploadFileToSignedVaultUrl,
  type AllowedMimeType,
} from '@/features/storage';
import {
  processDocumentOcrAction,
  registerUploadedDocumentAction,
  requestDocumentUploadUrlAction,
} from '../dal/documentActions';

export type QueueTaskStep =
  | 'queued'
  | 'uploading'
  | 'analyzing'
  | 'completed'
  | 'error';

export interface UploadQueueTask {
  readonly localId: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly step: QueueTaskStep;
  readonly detailMessage: string | null;
  readonly documentId?: string;
}

export interface EnqueueFilesResult {
  readonly uploadedCount: number;
  readonly failedCount: number;
}

const UPLOAD_CONCURRENCY = 3;
const OCR_CONCURRENCY = 2;

const runBoundedConcurrency = async <T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> => {
  let currentIndex = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (currentIndex < items.length) {
        const index = currentIndex;
        currentIndex += 1;
        const current = items[index];
        if (current !== undefined) {
          await worker(current);
        }
      }
    }
  );
  await Promise.all(runners);
};

export const useBulkUploadQueue = () => {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<readonly UploadQueueTask[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const patchTask = useCallback(
    (localId: string, patch: Partial<UploadQueueTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.localId === localId ? { ...t, ...patch } : t))
      );
    },
    []
  );

  const enqueueFiles = useCallback(
    async (rawFiles: readonly File[]): Promise<EnqueueFilesResult> => {
      if (rawFiles.length === 0) {
        return { uploadedCount: 0, failedCount: 0 };
      }

      setIsProcessingBatch(true);
      try {
        const prepared = rawFiles.map((file) => ({
          localId: globalThis.crypto.randomUUID(),
          file,
        }));

        setTasks((prev) => [
          ...prepared.map(({ localId, file }) => ({
            localId,
            fileName: file.name,
            fileSizeBytes: file.size,
            step: 'queued' as const,
            detailMessage: null,
          })),
          ...prev,
        ]);

        const uploadedForOcr: Array<{ localId: string; documentId: string }> = [];
        let failedCount = 0;

        await runBoundedConcurrency(
          prepared,
          UPLOAD_CONCURRENCY,
          async ({ localId, file }) => {
            if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
              failedCount += 1;
              patchTask(localId, {
                step: 'error',
                detailMessage: 'Файлът трябва да е между 1 байт и 50 MB.',
              });
              return;
            }

            if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
              failedCount += 1;
              patchTask(localId, {
                step: 'error',
                detailMessage: 'Разрешени са само PDF, JPEG, PNG и WebP.',
              });
              return;
            }

            patchTask(localId, {
              step: 'uploading',
              detailMessage: 'Качване в сейфа...',
            });

            try {
              const signedRes = await requestDocumentUploadUrlAction({
                fileName: file.name,
                fileSizeBytes: file.size,
                mimeType: file.type,
              });

              if (!signedRes.ok) {
                throw new Error(signedRes.errorMessage);
              }

              await uploadFileToSignedVaultUrl(
                signedRes.data.bucket,
                signedRes.data.storagePath,
                signedRes.data.token,
                file,
                file.type
              );

              const regRes = await registerUploadedDocumentAction({
                storagePath: signedRes.data.storagePath,
                originalFileName: file.name,
                mimeType: file.type,
                fileSizeBytes: file.size,
              });

              if (!regRes.ok) {
                throw new Error(regRes.errorMessage);
              }

              uploadedForOcr.push({ localId, documentId: regRes.data.id });
              patchTask(localId, {
                documentId: regRes.data.id,
                detailMessage: 'В опашка за OCR & RAG вектори...',
              });
            } catch (err) {
              failedCount += 1;
              patchTask(localId, {
                step: 'error',
                detailMessage:
                  err instanceof Error ? err.message : 'Грешка при качване.',
              });
            }
          }
        );

        await queryClient.invalidateQueries({ queryKey: ['documents'] });

        await runBoundedConcurrency(
          uploadedForOcr,
          OCR_CONCURRENCY,
          async ({ localId, documentId }) => {
            patchTask(localId, {
              step: 'analyzing',
              detailMessage: 'OCR анализ (DE/BG/EL) + RAG вектор...',
            });

            const ocrRes = await processDocumentOcrAction({ id: documentId }).catch(
              (): { readonly ok: false; readonly errorMessage: string } => ({
                ok: false,
                errorMessage: 'Грешка при стартиране на OCR анализа.',
              })
            );

            if (!ocrRes.ok || ocrRes.data.status === 'failed') {
              patchTask(localId, {
                step: 'completed',
                detailMessage:
                  ocrRes.ok && ocrRes.data.aiError
                    ? `Качен (ръчен преглед): ${ocrRes.data.aiError}`
                    : 'Качен за ръчен преглед.',
              });
            } else {
              patchTask(localId, {
                step: 'completed',
                detailMessage: 'Готов за одобрение!',
              });
            }

            await queryClient.invalidateQueries({ queryKey: ['documents'] });
          }
        );

        return {
          uploadedCount: uploadedForOcr.length,
          failedCount,
        };
      } finally {
        setIsProcessingBatch(false);
      }
    },
    [patchTask, queryClient]
  );

  const clearFinishedTasks = useCallback(() => {
    setTasks((prev) =>
      prev.filter(
        (t) =>
          t.step === 'queued' || t.step === 'uploading' || t.step === 'analyzing'
      )
    );
  }, []);

  return {
    tasks,
    isProcessingBatch,
    enqueueFiles,
    clearFinishedTasks,
  };
};

'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestDocumentUploadUrlAction } from '@/features/documents';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  uploadFileToSignedVaultUrl,
  type AllowedMimeType,
} from '@/features/storage';
import { VAULT_QUERY_KEYS } from '@/features/vault';
import {
  cleanupTemporaryAttachmentAction,
  confirmAssistantDeleteAction,
  createAssistantSessionAction,
  deleteAssistantSessionAction,
  fetchAssistantWorkspaceAction,
  sendAssistantMessageAction,
} from '../dal/assistantActions';
import type { DeleteTarget } from '../schemas/assistantSchema';
import type { AssistantWorkspaceSnapshot } from '../schemas/assistantViewTypes';

export const ASSISTANT_QUERY_KEYS = {
  workspace: (sessionId: string | null) =>
    ['assistant', 'workspace', sessionId ?? 'latest'] as const,
};

export interface SendMessagePayload {
  readonly message: string;
  readonly file: File | null;
  readonly saveToVault: boolean;
}

const isAllowedMime = (mime: string): mime is AllowedMimeType =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);

export const useAssistantChat = (initialSnapshot?: AssistantWorkspaceSnapshot) => {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSnapshot?.activeSessionId ?? null
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const isInitialMatch =
    initialSnapshot !== undefined &&
    selectedSessionId === initialSnapshot.activeSessionId;

  const workspaceQuery = useQuery({
    queryKey: ASSISTANT_QUERY_KEYS.workspace(selectedSessionId),
    queryFn: async () => {
      const res = await fetchAssistantWorkspaceAction({
        sessionId: selectedSessionId,
      });
      if (!res.ok) {
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    initialData: isInitialMatch ? initialSnapshot : undefined,
  });

  const applySnapshot = useCallback(
    async (snapshot: AssistantWorkspaceSnapshot) => {
      setSelectedSessionId(snapshot.activeSessionId);
      queryClient.setQueryData(
        ASSISTANT_QUERY_KEYS.workspace(snapshot.activeSessionId),
        snapshot
      );
      await queryClient.invalidateQueries({ queryKey: ['assistant', 'workspace'] });
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.facts });
    },
    [queryClient]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      setErrorBanner(null);
      let attachment = null;
      let uploadedPath: string | null = null;
      let actionSucceeded = false;

      try {
        if (payload.file) {
          const file = payload.file;
          if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error('Файлът трябва да е между 1 байт и 50 MB.');
          }
          if (!isAllowedMime(file.type)) {
            throw new Error('Разрешени са само PDF, JPEG, PNG и WebP файлове.');
          }

          setUploadStatus(`Защитено качване на „${file.name}“...`);
          try {
            const signed = await requestDocumentUploadUrlAction({
              fileName: file.name,
              fileSizeBytes: file.size,
              mimeType: file.type,
            });
            if (!signed.ok) {
              throw new Error(signed.errorMessage);
            }

            await uploadFileToSignedVaultUrl(
              signed.data.bucket,
              signed.data.storagePath,
              signed.data.token,
              file,
              file.type
            );
            uploadedPath = signed.data.storagePath;

            attachment = {
              storagePath: signed.data.storagePath,
              fileName: file.name,
              mimeType: file.type,
              fileSizeBytes: file.size,
              saveToVault: payload.saveToVault,
            };
          } finally {
            setUploadStatus(null);
          }
        }

        const activeId =
          workspaceQuery.data?.activeSessionId ?? selectedSessionId;
        const res = await sendAssistantMessageAction({
          sessionId: activeId,
          message: payload.message,
          attachment,
        });

        if (!res.ok) {
          throw new Error(res.errorMessage);
        }
        actionSucceeded = true;
        return res.data;
      } finally {
        if (uploadedPath && !actionSucceeded) {
          await cleanupTemporaryAttachmentAction({ storagePath: uploadedPath }).catch(
            () => undefined
          );
        }
      }
    },
    onSuccess: applySnapshot,
    onError: (err) => {
      setErrorBanner(
        err instanceof Error ? err.message : 'Неуспешно изпращане на съобщението.'
      );
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      setErrorBanner(null);
      const res = await createAssistantSessionAction();
      if (!res.ok) {
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    onSuccess: applySnapshot,
    onError: (err) => {
      setErrorBanner(err instanceof Error ? err.message : 'Грешка при нов разговор.');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      setErrorBanner(null);
      const res = await deleteAssistantSessionAction({ sessionId });
      if (!res.ok) {
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    onSuccess: applySnapshot,
    onError: (err) => {
      setErrorBanner(
        err instanceof Error ? err.message : 'Грешка при изтриване на разговор.'
      );
    },
  });

  const confirmDeleteMutation = useMutation({
    mutationFn: async (input: {
      readonly target: DeleteTarget;
      readonly ids: readonly string[];
    }) => {
      setErrorBanner(null);
      const activeId =
        workspaceQuery.data?.activeSessionId ?? selectedSessionId;
      const res = await confirmAssistantDeleteAction({
        ...input,
        sessionId: activeId,
      });
      if (!res.ok) {
        if (res.partialData) {
          await applySnapshot(res.partialData.snapshot);
          await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.secrets });
        }
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    onSuccess: async (outcome) => {
      await applySnapshot(outcome.snapshot);
      await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.secrets });
    },
    onError: (err) => {
      setErrorBanner(
        err instanceof Error ? err.message : 'Грешка при физическо изтриване.'
      );
    },
  });

  return {
    sessions: workspaceQuery.data?.sessions ?? [],
    activeSessionId: workspaceQuery.data?.activeSessionId ?? selectedSessionId,
    messages: workspaceQuery.data?.messages ?? [],
    isLoadingWorkspace: workspaceQuery.isLoading,
    isWorkspaceLoaded: workspaceQuery.isSuccess,
    uploadStatus,
    errorBanner,
    setErrorBanner,
    selectSession: (id: string | null) => {
      setErrorBanner(null);
      setSelectedSessionId(id);
    },
    sendMessageMutation,
    createSessionMutation,
    deleteSessionMutation,
    confirmDeleteMutation,
  };
};

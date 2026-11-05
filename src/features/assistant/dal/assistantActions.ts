'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { purgeDocumentsHard } from '@/features/documents/server';
import {
  purgeVaultFactsBatch,
  purgeVaultSecretsBatch,
} from '@/features/vault/server';
import {
  isSecretIntentMessage,
  SECRET_CHAT_PLACEHOLDER,
} from '../agents/keywordClassifier';
import { runKronosSupervisorGraph } from '../agents/supervisorGraph';
import {
  confirmDeleteInputSchema,
  emptyTurnPayload,
  sendChatMessageInputSchema,
  sessionIdInputSchema,
} from '../schemas/assistantSchema';
import type {
  AssistantActionResponse,
  AssistantWorkspaceSnapshot,
} from '../schemas/assistantViewTypes';
import { cleanupTemporaryAttachment } from './assistantAttachmentDal';
import {
  appendChatMessage,
  createChatSession,
  deleteChatSessionHard,
  getRecentChatHistory,
  resolveChatSession,
} from './assistantChatDal';
import { loadAssistantWorkspaceSnapshot } from './assistantMessagesDal';

const optionalSessionSchema = z
  .object({
    sessionId: z.string().uuid().nullable().optional(),
  })
  .optional();

const confirmDeleteWithSessionSchema = confirmDeleteInputSchema.extend({
  sessionId: z.string().uuid().nullable().optional(),
});

const cleanupAttachmentSchema = z.object({
  storagePath: z.string().trim().min(5).max(500),
});

const revalidateAllWorkspaces = (): void => {
  revalidatePath('/');
  revalidatePath('/documents');
  revalidatePath('/vault');
};

export const fetchAssistantWorkspaceAction = async (
  rawInput?: unknown
): Promise<AssistantActionResponse<AssistantWorkspaceSnapshot>> => {
  try {
    const parsed = optionalSessionSchema.safeParse(rawInput);
    const requestedId = parsed.success ? (parsed.data?.sessionId ?? null) : null;
    const snapshot = await loadAssistantWorkspaceSnapshot(requestedId);
    return { ok: true, data: snapshot };
  } catch (err) {
    console.error('[AssistantActions] fetchAssistantWorkspaceAction error:', err);
    return {
      ok: false,
      errorMessage: 'Неуспешно зареждане на AI Асистента.',
    };
  }
};

export const createAssistantSessionAction = async (): Promise<
  AssistantActionResponse<AssistantWorkspaceSnapshot>
> => {
  try {
    const newId = await createChatSession();
    revalidatePath('/');
    const snapshot = await loadAssistantWorkspaceSnapshot(newId);
    return { ok: true, data: snapshot };
  } catch (err) {
    console.error('[AssistantActions] createAssistantSessionAction error:', err);
    return {
      ok: false,
      errorMessage: 'Неуспешно стартиране на нов разговор.',
    };
  }
};

export const deleteAssistantSessionAction = async (
  rawInput: unknown
): Promise<AssistantActionResponse<AssistantWorkspaceSnapshot>> => {
  try {
    const parsed = sessionIdInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден идентификатор на разговор.' };
    }
    await deleteChatSessionHard(parsed.data.sessionId);
    revalidatePath('/');
    const snapshot = await loadAssistantWorkspaceSnapshot(null);
    return { ok: true, data: snapshot };
  } catch (err) {
    console.error('[AssistantActions] deleteAssistantSessionAction error:', err);
    return {
      ok: false,
      errorMessage: 'Неуспешно изтриване на разговора.',
    };
  }
};

export const cleanupTemporaryAttachmentAction = async (
  rawInput: unknown
): Promise<AssistantActionResponse<null>> => {
  try {
    const parsed = cleanupAttachmentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден път към временен файл.' };
    }
    await cleanupTemporaryAttachment(parsed.data.storagePath);
    return { ok: true, data: null };
  } catch (err) {
    console.error('[AssistantActions] cleanupTemporaryAttachmentAction error:', err);
    return { ok: false, errorMessage: 'Неуспешно почистване на временния файл.' };
  }
};

export const sendAssistantMessageAction = async (
  rawInput: unknown
): Promise<AssistantActionResponse<AssistantWorkspaceSnapshot>> => {
  try {
    const parsed = sendChatMessageInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage:
          parsed.error.issues[0]?.message ?? 'Невалидно съобщение към асистента.',
      };
    }

    const { message, attachment } = parsed.data;
    const isSecret = isSecretIntentMessage(message);
    const persistedMessage = isSecret ? SECRET_CHAT_PLACEHOLDER : message;
    const titleSeed = isSecret
      ? 'Сигурен панел за пароли'
      : message || attachment?.fileName || 'Нов разговор';

    let sessionId: string;
    try {
      sessionId = await resolveChatSession(parsed.data.sessionId, titleSeed);
      const history = await getRecentChatHistory(sessionId, 6);

      const userVisibleText = attachment
        ? persistedMessage
          ? `${persistedMessage}\n\n📎 Прикачен файл: ${attachment.fileName}`
          : `📎 Прикачен файл: ${attachment.fileName}`
        : persistedMessage;

      await appendChatMessage({
        sessionId,
        role: 'user',
        content: userVisibleText,
      });

      const turn = await runKronosSupervisorGraph({
        message,
        attachment: attachment ?? null,
        history,
      });

      await appendChatMessage({
        sessionId,
        role: 'assistant',
        content: turn.replyText,
        payload: turn.payload,
        zone1Ids: turn.zone1DocumentIds,
        zone2Ids: turn.zone2DocumentIds,
      });
    } finally {
      if (attachment && !attachment.saveToVault) {
        await cleanupTemporaryAttachment(attachment.storagePath);
      }
    }

    revalidateAllWorkspaces();
    const snapshot = await loadAssistantWorkspaceSnapshot(sessionId);
    return { ok: true, data: snapshot };
  } catch (err) {
    console.error('[AssistantActions] sendAssistantMessageAction error:', err);
    return {
      ok: false,
      errorMessage: 'Възникна грешка при изпращане на съобщението. Моля, опитайте отново.',
    };
  }
};

export const confirmAssistantDeleteAction = async (
  rawInput: unknown
): Promise<
  AssistantActionResponse<{
    readonly deletedCount: number;
    readonly snapshot: AssistantWorkspaceSnapshot;
  }>
> => {
  let deletedCount = 0;
  let targetSessionId: string | null = null;
  try {
    const parsed = confirmDeleteWithSessionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалидни параметри за изтриване.' };
    }

    const { target, ids, sessionId } = parsed.data;
    targetSessionId = sessionId ?? null;

    if (target === 'documents') {
      const res = await purgeDocumentsHard(ids);
      deletedCount = res.purgedCount;
    } else if (target === 'facts') {
      deletedCount = await purgeVaultFactsBatch(ids);
    } else {
      deletedCount = await purgeVaultSecretsBatch(ids);
    }

    if (sessionId) {
      const targetLabel =
        target === 'documents'
          ? 'документа (файл в Storage + OCR + вектори)'
          : target === 'facts'
            ? 'лични записа'
            : 'криптирани пароли';

      await appendChatMessage({
        sessionId,
        role: 'assistant',
        content: `✅ Изтрих завинаги (100% Hard Purge) ${deletedCount} ${targetLabel} от всички слоеве на KRONOS.`,
        payload: {
          ...emptyTurnPayload(),
          department: 'vault_search_and_manage',
          tier: 'local',
        },
      });
    }

    revalidateAllWorkspaces();
    const snapshot = await loadAssistantWorkspaceSnapshot(targetSessionId);
    return { ok: true, data: { deletedCount, snapshot } };
  } catch (err) {
    if (err instanceof Error && err.message === 'STEP_UP_PIN_REQUIRED') {
      return {
        ok: false,
        errorMessage: 'За изтриване на парола потвърдете вашия 4-цифрен Step-Up ПИН.',
      };
    }
    console.error('[AssistantActions] confirmAssistantDeleteAction error:', err);
    if (deletedCount > 0) {
      revalidateAllWorkspaces();
      const snapshot = await loadAssistantWorkspaceSnapshot(targetSessionId).catch(
        () => undefined
      );
      return {
        ok: false,
        errorMessage:
          'Записите бяха изтрити завинаги, но възникна грешка при обновяване на чат историята.',
        partialData: snapshot ? { deletedCount, snapshot } : undefined,
      };
    }
    return {
      ok: false,
      errorMessage: 'Неуспешно физическо изтриване (Hard Purge).',
    };
  }
};

import 'server-only';
import { saveAttachmentToVault } from '../dal/assistantAttachmentDal';
import {
  agentExecutionInputSchema,
  assistantTurnPayloadSchema,
  assistantTurnResultSchema,
  type AgentExecutionRawInput,
  type AssistantTurnResult,
  type ChatAttachmentInput,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import type { LlmTextInvoker } from '@/lib/ai/llmJsonService';
import type { HandlerOutput, VaultHandlerContext } from './agentTypes';
import { DEFAULT_DEPARTMENT_CRITERIA } from './jevClient';
import { isSecretIntentMessage } from './keywordClassifier';
import {
  handleDeleteDocuments,
  handleSearchDocuments,
  handleUpdateDocument,
  tryExecutePendingDeleteConfirmation,
  type DocumentHandlerDeps,
} from './vaultDocumentHandlers';
import {
  handleCreateFact,
  handleDeleteFacts,
  handleListFacts,
  handleUpdateFact,
} from './vaultFactHandlers';
import { planVaultAction } from './vaultAgentPlanner';

const SECRET_UPDATE_REGEX = /смени|промени|обнови|редактирай|актуализирай|ändern/i;
const SECRET_CREATE_REGEX = /добави|запази|нова\s+парола|създай|запиши|speichern/i;
const SECRET_HINT_REGEX =
  /(?:парола(?:та)?|пин(?:\s+код(?:а)?)?|pin)\s+(?:за|на)\s+([^,.:;=\n]{2,60})/i;
const EXPLICIT_WRITE_INTENT_REGEX =
  /запази|запиши|добави|въведи|създай|промени|смени|редактирай|обнови|преименувай|актуализирай|коригирай|задай|изчисти|премахни\s+(?:дата|срок|бележка)|save|add|create|update|edit|rename|change|set|speicher|hinzufüg|änder|aktualisier|umbenenn/i;
const WRITE_PLAN_ACTIONS = new Set(['update_document', 'create_fact', 'update_fact']);

const GENERIC_ERROR_TEXT =
  'Възникна грешка при обработката на заявката. Опитайте отново след малко.';
const AI_FALLBACK_NOTE =
  '\n\n⚠️ AI планирането е временно недостъпно — използвах резервен анализ по ключови думи.';

export interface VaultAgentDeps extends DocumentHandlerDeps {
  readonly invoker?: LlmTextInvoker;
  readonly saveAttachment?: typeof saveAttachmentToVault;
}

const extractSafeSecretHint = (message: string): string | null => {
  const raw = message.match(SECRET_HINT_REGEX)?.[1]?.trim();
  if (!raw) {
    return null;
  }
  const withoutValue = raw.split(/\s+(?:е|са|на\s+стойност|is)\s+/i)[0]?.trim() ?? '';
  return withoutValue.length >= 2 ? withoutValue.slice(0, 60) : null;
};

export const handleSecretsRequest = (message: string): HandlerOutput => {
  const mode = SECRET_UPDATE_REGEX.test(message)
    ? 'edit'
    : SECRET_CREATE_REGEX.test(message)
      ? 'create'
      : 'browse';
  const searchHint = extractSafeSecretHint(message);
  return {
    replyText:
      'Паролите и тайните никога не минават през AI и не се пазят в чата. Потвърдете 4-цифрения ПИН (Step-Up) в защитения панел по-долу, за да ги видите, промените, добавите или изтриете.',
    payload: {
      actions: [{ kind: 'secrets_gate', mode, purpose: 'step_up', searchHint }],
    },
  };
};

const handleAttachmentSave = async (
  attachment: ChatAttachmentInput,
  save: typeof saveAttachmentToVault
): Promise<HandlerOutput> => {
  const saved = await save(attachment);
  if (saved.alreadyExisted) {
    return {
      replyText: `Документът „${saved.title}“ вече е в сейфа.`,
      payload: {
        actions: [{ kind: 'notice', tone: 'success', text: 'Документът е в сейфа.', documentId: saved.documentId }],
      },
      zone1Ids: [saved.documentId],
      zone2Ids: [],
    };
  }

  const warning = saved.aiError
    ? ' Автоматичното OCR разчитане не успя — можете да попълните данните ръчно в Документния Сейф.'
    : '';
  return {
    replyText: `Качих „${saved.title}“ в сейфа. Чака вашето одобрение в Документния Сейф (метаданни и факти).${warning}`,
    payload: {
      actions: [
        {
          kind: 'notice',
          tone: saved.aiError ? 'warning' : 'success',
          text: 'Документът чака одобрение в Документния Сейф.',
          documentId: saved.documentId,
        },
      ],
    },
  };
};

const dispatchPlan = async (
  ctx: VaultHandlerContext,
  attachment: ChatAttachmentInput | null,
  deps: VaultAgentDeps
): Promise<HandlerOutput> => {
  if (
    WRITE_PLAN_ACTIONS.has(ctx.plan.action) &&
    !EXPLICIT_WRITE_INTENT_REGEX.test(ctx.message)
  ) {
    return {
      replyText:
        'За сигурност промяна или запис в сейфа се извършва само при изрична команда (напр. „запази …“, „промени …“ или „преименувай …“). Потвърдете какво точно желаете да запиша или променя.',
    };
  }

  switch (ctx.plan.action) {
    case 'save_attachment':
      return attachment
        ? handleAttachmentSave(attachment, deps.saveAttachment ?? saveAttachmentToVault)
        : { replyText: 'Прикачете файл (PDF или снимка), за да го запазя в сейфа.' };
    case 'update_document':
      return handleUpdateDocument(ctx, deps);
    case 'delete_documents':
      return handleDeleteDocuments(ctx, deps);
    case 'list_facts':
      return handleListFacts(ctx);
    case 'create_fact':
      return handleCreateFact(ctx);
    case 'update_fact':
      return handleUpdateFact(ctx);
    case 'delete_facts':
      return handleDeleteFacts(ctx);
    case 'chat_only':
      return {
        replyText:
          ctx.plan.answer ||
          'Мога да търся документи, да управлявам личните ви данни и да помагам с немска бюрокрация. Какво да направя?',
      };
    case 'search_documents':
    default:
      return handleSearchDocuments(ctx, deps);
  }
};

const buildSafeFallbackResult = (replyText: string): AssistantTurnResult => ({
  replyText,
  payload: {
    department: 'vault_search_and_manage',
    intent: null,
    tier: 'offline',
    errorCode: null,
    facts: [],
    guide: null,
    draft: null,
    actions: [],
    portalDocumentIds: [],
    agentStateSnapshot: null,
  },
  zone1DocumentIds: [],
  zone2DocumentIds: [],
});

export const executeVaultAgent = async (
  rawInput: AgentExecutionRawInput,
  deps: VaultAgentDeps = {}
): Promise<AssistantTurnResult> => {
  try {
    const inputParsed = agentExecutionInputSchema.safeParse(rawInput);
    if (!inputParsed.success) {
      return buildSafeFallbackResult(GENERIC_ERROR_TEXT);
    }
    const input = inputParsed.data;

    let output: HandlerOutput;
    let aiAvailable = true;
    let plannedAction = 'search_documents';
    let plannedTopic: string | null = null;

    try {
      const confirmedDelete = await tryExecutePendingDeleteConfirmation(
        input.message,
        input.previousAgentState
      );
      if (confirmedDelete) {
        output = confirmedDelete;
        plannedAction = 'confirmed_delete';
      } else if (
        input.intent === 'manage_secret' ||
        isSecretIntentMessage(input.message)
      ) {
        output = handleSecretsRequest(input.message);
        plannedAction = 'manage_secret';
      } else {
        const planned = await planVaultAction(
          {
            message: input.message,
            intent: input.intent,
            hasAttachment: input.attachment !== null,
            ingestedAttachment: input.ingestedAttachment,
            previousAgentState: input.previousAgentState,
            nowIso: input.nowIso,
            history: input.history,
          },
          deps.invoker
        );
        aiAvailable = planned.aiAvailable;

        const effectivePlan = input.attachment?.saveToVault
          ? { ...planned.plan, action: 'save_attachment' as const }
          : planned.plan;

        plannedAction = effectivePlan.action;
        plannedTopic = effectivePlan.topic;

        output = await dispatchPlan(
          {
            message: input.message,
            nowIso: input.nowIso,
            plan: effectivePlan,
            tier: input.tier,
          },
          input.attachment,
          deps
        );
      }
    } catch (err) {
      console.error('[VaultAgent] execution failed:', err);
      output = { replyText: GENERIC_ERROR_TEXT };
    }

    const confirmDeleteAction = output.payload?.actions?.find(
      (a) => a.kind === 'confirm_delete'
    );

    const payloadParsed = assistantTurnPayloadSchema.safeParse({
      department: 'vault_search_and_manage',
      intent: input.intent,
      tier: input.tier,
      errorCode: aiAvailable ? null : 'AI_UNAVAILABLE',
      agentStateSnapshot: {
        lastAction: plannedAction,
        lastTopic: plannedTopic,
        lastZone1Ids: output.zone1Ids ?? [],
        pendingConfirmDelete:
          confirmDeleteAction && confirmDeleteAction.kind === 'confirm_delete'
            ? {
                target: confirmDeleteAction.target,
                ids: confirmDeleteAction.ids,
              }
            : null,
      },
      ...output.payload,
    });
    if (!payloadParsed.success) {
      return buildSafeFallbackResult(GENERIC_ERROR_TEXT);
    }

    const turnParsed = assistantTurnResultSchema.safeParse({
      replyText: aiAvailable ? output.replyText : `${output.replyText}${AI_FALLBACK_NOTE}`,
      payload: payloadParsed.data,
      zone1DocumentIds: output.zone1Ids ?? [],
      zone2DocumentIds: output.zone2Ids ?? [],
    });
    if (!turnParsed.success) {
      return buildSafeFallbackResult(GENERIC_ERROR_TEXT);
    }
    return turnParsed.data;
  } catch (err) {
    console.error('[VaultAgent] unexpected validation error:', err);
    return buildSafeFallbackResult(GENERIC_ERROR_TEXT);
  }
};

export const vaultSearchAndManageAgent: SubAgentManifest = {
  agentId: 'vaultSearchAndManageAgent',
  department: 'vault_search_and_manage',
  jevCriteria: DEFAULT_DEPARTMENT_CRITERIA.vault_search_and_manage,
  inputSchema: agentExecutionInputSchema,
  outputSchema: assistantTurnResultSchema,
  execute: (input) => executeVaultAgent(input),
};

import 'server-only';
import { saveAttachmentToVault } from '../dal/assistantAttachmentDal';
import {
  agentExecutionInputSchema,
  assistantTurnPayloadSchema,
  assistantTurnResultSchema,
  type AgentExecutionInput,
  type AssistantTurnResult,
  type ChatAttachmentInput,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import type { LlmTextInvoker } from '@/lib/ai/llmJsonService';
import type { HandlerOutput, VaultHandlerContext } from './agentTypes';
import { isSecretIntentMessage } from './keywordClassifier';
import {
  handleDeleteDocuments,
  handleSearchDocuments,
  handleUpdateDocument,
  type DocumentHandlerDeps,
} from './vaultDocumentHandlers';
import {
  handleCreateFact,
  handleDeleteFacts,
  handleListFacts,
  handleUpdateFact,
} from './vaultFactHandlers';
import { planVaultAction } from './vaultAgentPlanner';

const SECRET_CREATE_REGEX = /добави|запази|нова\s+парола|създай|смени|промени|запиши|speichern/i;
const SECRET_HINT_REGEX = /парола(?:та)?\s+(?:за|на)\s+([^,.:;\n]{2,60})/i;
const GENERIC_ERROR_TEXT =
  'Възникна грешка при обработката на заявката. Опитайте отново след малко.';
const AI_FALLBACK_NOTE =
  '\n\n⚠️ AI планирането е временно недостъпно — използвах резервен анализ по ключови думи.';

export interface VaultAgentDeps extends DocumentHandlerDeps {
  readonly invoker?: LlmTextInvoker;
  readonly saveAttachment?: typeof saveAttachmentToVault;
}

export const handleSecretsRequest = (message: string): HandlerOutput => {
  const mode = SECRET_CREATE_REGEX.test(message) ? 'create' : 'browse';
  const searchHint = message.match(SECRET_HINT_REGEX)?.[1]?.trim() ?? null;
  return {
    replyText:
      'Паролите и тайните никога не минават през AI и не се пазят в чата. Потвърдете 4-цифрения ПИН (Step-Up) в защитения панел по-долу, за да ги видите, добавите или изтриете.',
    payload: { actions: [{ kind: 'secrets_gate', mode, searchHint }] },
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
    ? ` OCR анализът не успя (${saved.aiError}) — можете да попълните данните ръчно в Документния Сейф.`
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

export const executeVaultAgent = async (
  rawInput: AgentExecutionInput,
  deps: VaultAgentDeps = {}
): Promise<AssistantTurnResult> => {
  const input = agentExecutionInputSchema.parse(rawInput);
  let output: HandlerOutput;
  let aiAvailable = true;

  try {
    if (input.intent === 'manage_secret' || isSecretIntentMessage(input.message)) {
      output = handleSecretsRequest(input.message);
    } else {
      const planned = await planVaultAction(
        {
          message: input.message,
          intent: input.intent,
          hasAttachment: input.attachment !== null,
          nowIso: input.nowIso,
          history: input.history,
        },
        deps.invoker
      );
      aiAvailable = planned.aiAvailable;

      const effectivePlan =
        input.attachment &&
        (input.attachment.saveToVault || input.intent === 'save_or_update_document')
          ? { ...planned.plan, action: 'save_attachment' as const }
          : planned.plan;

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

  const payload = assistantTurnPayloadSchema.parse({
    department: 'vault_search_and_manage',
    intent: input.intent,
    tier: input.tier,
    errorCode: aiAvailable ? null : 'AI_UNAVAILABLE',
    ...output.payload,
  });

  return assistantTurnResultSchema.parse({
    replyText: aiAvailable ? output.replyText : `${output.replyText}${AI_FALLBACK_NOTE}`,
    payload,
    zone1DocumentIds: output.zone1Ids ?? [],
    zone2DocumentIds: output.zone2Ids ?? [],
  });
};

export const vaultSearchAndManageAgent: SubAgentManifest = {
  agentId: 'vaultSearchAndManageAgent',
  department: 'vault_search_and_manage',
  jevCriteria:
    'Търсене, намиране, качване, промяна и изтриване на документи в сейфа; лични факти (Steuer-ID, IBAN, Kaltmiete); пароли и тайни.',
  inputSchema: agentExecutionInputSchema,
  outputSchema: assistantTurnResultSchema,
  execute: (input) => executeVaultAgent(input),
};

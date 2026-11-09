import 'server-only';
import { z } from 'zod';
import { getAiModelsConfig } from '@/config/aiModelsConfig';
import { callJsonModel, type LlmTextInvoker } from '@/lib/ai/llmJsonService';
import { saveAttachmentToVault } from '../dal/assistantAttachmentDal';
import {
  agentExecutionInputSchema,
  assistantTurnPayloadSchema,
  assistantTurnResultSchema,
  type AgentExecutionRawInput,
  type AssistantActionCard,
  type AssistantTurnResult,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import { DEFAULT_DEPARTMENT_CRITERIA } from './jevClient';
import { isSecretIntentMessage } from './keywordClassifier';
import { handleSecretsRequest } from './vaultSearchAndManageAgent';

export const SAVE_TO_RAG_REGEX =
  /(?:запази|запиши|добави|качи)(?:\s+(?:го|я|това|файла|документа|снимката))?\s+в\s+(?:rag\s+)?сейфа|(?:запази|запиши)\s+(?:този\s+|тази\s+)?(?:файл(?:а)?|документ(?:а)?|снимка(?:та)?)|\bsave\s+(?:it\s+|this\s+|the\s+(?:file|document|image)\s+)?to\s+(?:the\s+)?(?:rag\s+)?vault\b|\b(?:im\s+tresor\s+speichern|in\s+den\s+tresor\s+speichern|(?:dokument|datei|bild)\s+speichern)\b/i;

export const generalChatResponseSchema = z.object({
  replyBg: z.string().trim().min(1).max(6000),
  topicSummary: z.string().trim().max(160).catch('Ежедневен разговор'),
});

const GENERAL_CHAT_SYSTEM_PROMPT = `Ти си ежедневният AI асистент (Normal AI Model) в системата KRONOS.
Отговаряш на български език (освен ако потребителят не поиска код или превод на друг език).
Правила:
- Когато потребителят е прикачил снимка или файл, в полето "ingestedAttachment" вече се намират разчетеният от Supervisor-а текст, резюме и данни — използвай ги директно, за да отговориш точно на въпроса му.
- Използвай "previousAgentState" и "recentMessages", за да поддържаш нишката на разговора.
- Никога не искай и не показвай пароли или ПИН кодове в чата.
- Върни САМО валиден JSON обект: {"replyBg": "твоят ясен и полезен отговор", "topicSummary": "кратка тема до 5 думи"}.`;

export interface GeneralChatAgentDeps {
  readonly invoker?: LlmTextInvoker;
  readonly saveAttachment?: typeof saveAttachmentToVault;
}

const buildFallbackGeneralResult = (
  replyText: string,
  errorCode: 'AI_UNAVAILABLE' | null = null
): AssistantTurnResult =>
  assistantTurnResultSchema.parse({
    replyText,
    payload: {
      department: 'general_chat',
      intent: 'general_chat',
      tier: 'offline',
      errorCode,
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

export const executeGeneralChatAgent = async (
  rawInput: AgentExecutionRawInput,
  deps: GeneralChatAgentDeps = {}
): Promise<AssistantTurnResult> => {
  try {
    const parsedInput = agentExecutionInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      return buildFallbackGeneralResult(
        'Невалидни входни данни за ежедневния AI модел.'
      );
    }
    const input = parsedInput.data;

    if (input.intent === 'manage_secret' || isSecretIntentMessage(input.message)) {
      const secretOut = handleSecretsRequest(input.message);
      return assistantTurnResultSchema.parse({
        replyText: secretOut.replyText,
        payload: assistantTurnPayloadSchema.parse({
          department: 'general_chat',
          intent: 'manage_secret',
          tier: 'local',
          errorCode: null,
          ...secretOut.payload,
        }),
        zone1DocumentIds: [],
        zone2DocumentIds: [],
      });
    }

    const actions: AssistantActionCard[] = [];
    const zone1Ids: string[] = [];
    let savedDocumentId: string | null = null;
    const shouldSaveAttachment =
      input.attachment !== null &&
      (input.attachment.saveToVault || SAVE_TO_RAG_REGEX.test(input.message));

    if (input.attachment && shouldSaveAttachment) {
      try {
        const saveFn = deps.saveAttachment ?? saveAttachmentToVault;
        const saved = await saveFn(input.attachment);
        savedDocumentId = saved.documentId;
        if (saved.alreadyExisted) {
          zone1Ids.push(saved.documentId);
        }
        actions.push({
          kind: 'notice',
          tone: saved.aiError ? 'warning' : 'success',
          text: saved.alreadyExisted
            ? `Документът „${saved.title}“ вече е в RAG Сейфа.`
            : `Записах „${saved.title}“ в RAG Сейфа (очаква потвърждение в /documents).`,
          documentId: saved.documentId,
        });
      } catch (saveErr) {
        console.error('[GeneralChatAgent] Failed to save attachment to RAG:', saveErr);
        actions.push({
          kind: 'notice',
          tone: 'warning',
          text: 'Файлът не можа да бъде записан автоматично в RAG Сейфа.',
          documentId: null,
        });
      }
    }

    try {
      const llmResponse = await callJsonModel({
        schema: generalChatResponseSchema,
        system: GENERAL_CHAT_SYSTEM_PROMPT,
        user: JSON.stringify({
          today: input.nowIso.slice(0, 10),
          previousAgentState: input.previousAgentState,
          recentMessages: input.history.slice(-6),
          ingestedAttachment: input.ingestedAttachment
            ? {
                fileName: input.ingestedAttachment.fileName,
                title: input.ingestedAttachment.title,
                topic: input.ingestedAttachment.topic,
                summaryText: input.ingestedAttachment.summaryText,
                rawOcrText: input.ingestedAttachment.rawOcrText.slice(0, 6000),
                suggestedFacts: input.ingestedAttachment.suggestedFacts,
              }
            : null,
          savedToRagVault: Boolean(savedDocumentId),
          message:
            input.message ||
            'Обясни ми какво съдържа прикаченият файл или снимка.',
        }),
        model: getAiModelsConfig().chatFast,
        temperature: 0.3,
        invoker: deps.invoker,
      });

      const payload = assistantTurnPayloadSchema.parse({
        department: 'general_chat',
        intent: input.intent,
        tier: input.tier,
        errorCode: null,
        facts: [],
        guide: null,
        draft: null,
        actions,
        portalDocumentIds: [],
        agentStateSnapshot: {
          lastTopic: llmResponse.topicSummary,
          hadAttachment: input.attachment !== null,
          savedDocumentId,
        },
      });

      return assistantTurnResultSchema.parse({
        replyText: llmResponse.replyBg,
        payload,
        zone1DocumentIds: zone1Ids,
        zone2DocumentIds: [],
      });
    } catch (aiErr) {
      console.error('[GeneralChatAgent] OpenRouter unavailable:', aiErr);
      const fallbackText = input.ingestedAttachment?.summaryText
        ? `AI моделът за разговор е временно недостъпен, но прочетох файла „${input.ingestedAttachment.title}“:\n\n${input.ingestedAttachment.summaryText}`
        : 'AI моделът в OpenRouter е временно недостъпен. Търсенето на документи в /documents и управлението на сейфа в /vault работят на 100%.';

      const payload = assistantTurnPayloadSchema.parse({
        department: 'general_chat',
        intent: input.intent,
        tier: 'offline',
        errorCode: 'AI_UNAVAILABLE',
        facts: [],
        guide: null,
        draft: null,
        actions,
        portalDocumentIds: [],
        agentStateSnapshot: null,
      });

      return assistantTurnResultSchema.parse({
        replyText: fallbackText,
        payload,
        zone1DocumentIds: zone1Ids,
        zone2DocumentIds: [],
      });
    }
  } catch (err) {
    console.error('[GeneralChatAgent] unexpected error:', err);
    return buildFallbackGeneralResult(
      'Възникна грешка при обработката на съобщението.',
      'AI_UNAVAILABLE'
    );
  }
};

export const generalChatAgent: SubAgentManifest = {
  agentId: 'generalChatAgent',
  department: 'general_chat',
  jevCriteria: DEFAULT_DEPARTMENT_CRITERIA.general_chat,
  inputSchema: agentExecutionInputSchema,
  outputSchema: assistantTurnResultSchema,
  execute: (input) => executeGeneralChatAgent(input),
};

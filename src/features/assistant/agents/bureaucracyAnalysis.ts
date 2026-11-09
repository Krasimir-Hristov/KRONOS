import 'server-only';
import { z } from 'zod';
import { getAiModelsConfig } from '@/config/aiModelsConfig';
import { DOCUMENT_TOPICS, type OcrDocumentInput } from '@/lib/ai/documentOcrService';
import { callJsonModel, type LlmTextInvoker } from '@/lib/ai/llmJsonService';
import { callVisionJson } from '@/lib/ai/visionJsonService';
import {
  draftReplySchema,
  portalGuideSchema,
  type AssistantIntent,
  type IngestedAttachmentContext,
} from '../schemas/assistantSchema';

export const bureaucracyAnalysisSchema = z.object({
  replyBg: z.string().trim().min(1).max(3500),
  guide: portalGuideSchema.nullable().catch(null),
  draft: draftReplySchema.nullable().catch(null),
});

export type BureaucracyAnalysis = z.infer<typeof bureaucracyAnalysisSchema>;

const BUREAUCRACY_SYSTEM_PROMPT = `Ти си експерт по немска бюрокрация (Wohngeld, Kinderzuschlag, Elterngeld, Finanzamt, Jobcenter, Familienkasse) и личен помощник в системата KRONOS. Потребителят живее в Германия и говори български.
Получаваш съобщение, и по желание вече прочетен от Supervisor-а документ ("ingestedAttachment") или скрийншот/PDF формуляр. Върни САМО валиден JSON:
{
  "replyBg": "Обяснение на прост български: какво се иска от потребителя, какъв е срокът и какво да направи сега (кратко, структурирано).",
  "guide": {
    "explanationBg": "Какво иска порталът/службата — на прост български.",
    "deadline": "Краен срок точно както е посочен (или null).",
    "steps": ["Стъпка 1 …", "Стъпка 2 …"],
    "neededDocuments": [ { "description": "напр. Kontoauszüge", "topic": "${DOCUMENT_TOPICS.join(' | ')} | null", "monthsBack": "брой последни месеци или null" } ],
    "neededFactLabels": ["Етикети на лични данни, които порталът иска: Steuer-ID, IBAN, Kaltmiete, Kindergeldnummer, адрес …"]
  } или null,
  "draft": { "subjectLine": "Betreff на немски", "germanText": "Пълен официален текст на безупречен немски (Sehr geehrte Damen und Herren … Mit freundlichen Grüßen)", "bulgarianExplanation": "Кратко обяснение на български какво пише в отговора и какво трябва да се провери преди изпращане." } или null
}
Правила:
- "draft" попълвай ТОГАВА, когато потребителят иска отговор, Widerspruch, писмо или молба; иначе null.
- За лични данни, които не са видими в писмото (име, адрес, Aktenzeichen, IBAN), използвай запълващи полета в квадратни скоби, напр. [Ваше име], [Aktenzeichen]. НИКОГА не измисляй стойности.
- В "neededFactLabels" слагай само ЕТИКЕТИ — не стойности.
- Никога не искай и не повтаряй пароли, ПИН или TAN кодове.
- Ако нещо не е ясно от скрийншота/писмото, кажи го в replyBg вместо да гадаеш.`;

export interface BureaucracyAnalysisInput {
  readonly message: string;
  readonly intent: AssistantIntent;
  readonly nowIso: string;
  readonly availableFactLabels: readonly string[];
  readonly history: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
  readonly source: OcrDocumentInput | null;
  readonly ingestedAttachment?: IngestedAttachmentContext | null;
  readonly previousAgentState?: Readonly<Record<string, unknown>> | null;
}

export interface BureaucracyAnalysisDeps {
  readonly invoker?: LlmTextInvoker;
  readonly fetchImpl?: typeof fetch;
}

export const analyzeBureaucracyRequest = async (
  input: BureaucracyAnalysisInput,
  deps: BureaucracyAnalysisDeps = {}
): Promise<BureaucracyAnalysis> => {
  const userPayload = JSON.stringify({
    today: input.nowIso.slice(0, 10),
    intent: input.intent,
    draftRequired: input.intent === 'draft_reply',
    savedFactLabels: input.availableFactLabels,
    previousAgentState: input.previousAgentState ?? null,
    ingestedAttachment: input.ingestedAttachment
      ? {
          fileName: input.ingestedAttachment.fileName,
          title: input.ingestedAttachment.title,
          topic: input.ingestedAttachment.topic,
          docType: input.ingestedAttachment.docType,
          sender: input.ingestedAttachment.sender,
          docDate: input.ingestedAttachment.docDate,
          expiresAt: input.ingestedAttachment.expiresAt,
          summaryText: input.ingestedAttachment.summaryText,
          rawOcrText: input.ingestedAttachment.rawOcrText.slice(0, 8000),
        }
      : null,
    recentMessages: input.history.slice(-4),
    message: input.message || 'Анализирай прикачения файл.',
  });
  const model = getAiModelsConfig().chatPro;

  if (input.source && !input.ingestedAttachment) {
    return callVisionJson({
      schema: bureaucracyAnalysisSchema,
      system: BUREAUCRACY_SYSTEM_PROMPT,
      user: userPayload,
      source: input.source,
      model,
      fetchImpl: deps.fetchImpl,
    });
  }

  return callJsonModel({
    schema: bureaucracyAnalysisSchema,
    system: BUREAUCRACY_SYSTEM_PROMPT,
    user: userPayload,
    model,
    temperature: 0.2,
    timeoutMs: 45_000,
    invoker: deps.invoker,
  });
};

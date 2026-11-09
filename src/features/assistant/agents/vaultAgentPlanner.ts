import 'server-only';
import { z } from 'zod';
import { getAiModelsConfig } from '@/config/aiModelsConfig';
import { isValidCalendarIsoDate } from '@/features/documents';
import { callJsonModel, type LlmTextInvoker } from '@/lib/ai/llmJsonService';
import {
  DOCUMENT_TOPICS,
  DOCUMENT_TYPES,
  FACT_CATEGORIES,
} from '@/lib/ai/documentOcrService';
import type {
  AssistantIntent,
  IngestedAttachmentContext,
} from '../schemas/assistantSchema';

export const VAULT_ACTIONS = [
  'search_documents',
  'save_attachment',
  'update_document',
  'delete_documents',
  'list_facts',
  'create_fact',
  'update_fact',
  'delete_facts',
  'chat_only',
] as const;

export type VaultAction = (typeof VAULT_ACTIONS)[number];

const optionalNullableIsoDate = z
  .union([
    z.string().trim().refine(isValidCalendarIsoDate),
    z.null(),
    z.undefined(),
  ])
  .catch(undefined);

const optionalNullableHint = z
  .union([z.string().trim().min(1).max(240), z.null(), z.undefined()])
  .catch(undefined);

const monthsBackSchema = z
  .preprocess((val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().int().min(1).max(36).nullable())
  .catch(null);

export const vaultPlanSchema = z.object({
  action: z.enum(VAULT_ACTIONS).catch('search_documents'),
  semanticQuery: z.string().trim().max(300).catch(''),
  searchTerms: z.array(z.string().trim().min(2).max(60)).max(3).catch([]),
  topic: z.enum(DOCUMENT_TOPICS).nullable().catch(null),
  monthsBack: monthsBackSchema,
  update: z
    .object({
      title: z.string().trim().max(200).nullable().catch(null),
      topic: z.enum(DOCUMENT_TOPICS).nullable().catch(null),
      docType: z.enum(DOCUMENT_TYPES).nullable().catch(null),
      sender: z.string().trim().max(160).nullable().catch(null),
      docDate: optionalNullableIsoDate,
      expiresAt: optionalNullableIsoDate,
    })
    .catch({
      title: null,
      topic: null,
      docType: null,
      sender: null,
      docDate: undefined,
      expiresAt: undefined,
    }),
  fact: z
    .object({
      label: z.string().trim().max(120).nullable().catch(null),
      value: z.string().trim().max(1000).nullable().catch(null),
      category: z.enum(FACT_CATEGORIES).nullable().catch(null),
      hint: optionalNullableHint,
    })
    .catch({ label: null, value: null, category: null, hint: undefined }),
  factQuery: z.string().trim().max(120).catch(''),
  answer: z.string().trim().max(1500).catch(''),
});

export type VaultPlan = z.infer<typeof vaultPlanSchema>;

const PLAN_SYSTEM_PROMPT = `Ти си планиращ модул на AI асистента KRONOS (личен документен сейф за DE/BG/EL документи).
Анализирай съобщението и върни САМО JSON обект със структура:
{
  "action": "search_documents | save_attachment | update_document | delete_documents | list_facts | create_fact | update_fact | delete_facts | chat_only",
  "semanticQuery": "кратко описание на търсения документ/тема (без дати и без глаголи)",
  "searchTerms": ["до 3 ключови термина, напр. Kinderzuschlag, Familienkasse, Sparkasse"],
  "topic": "${DOCUMENT_TOPICS.join(' | ')} | null",
  "monthsBack": "число (само ако се иска период в месеци назад, напр. 'последните 6 месеца') или null",
  "update": {},
  "fact": { "label": null, "value": null, "category": "${FACT_CATEGORIES.join(' | ')} | null" },
  "factQuery": "кои факти се търсят/променят/изтриват (напр. IBAN) или празно",
  "answer": "кратък отговор на български САМО при action=chat_only"
}
Правила: В update включвай САМО полетата (title, topic, docType [${DOCUMENT_TYPES.join(' | ')}], sender, docDate, expiresAt), които потребителят иска да промени; пропускай непроменените полета, а за docDate/expiresAt/fact.hint подавай null ЕДИНСТВЕНО при изрично поискано изчистване. Никога не поставяй пароли, ПИН кодове или тайни в fact.value — за тях action е "chat_only" с препоръка да се използва секция Пароли.
Днешната дата е подадена в полето "today"; за относителни дати (вчера, миналия месец) смятай спрямо нея.`;

export interface PlanVaultActionInput {
  readonly message: string;
  readonly intent: AssistantIntent;
  readonly hasAttachment: boolean;
  readonly ingestedAttachment?: IngestedAttachmentContext | null;
  readonly previousAgentState?: Readonly<Record<string, unknown>> | null;
  readonly nowIso: string;
  readonly history: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
}

const BG_STOPWORDS = new Set([
  'намери', 'покажи', 'търся', 'моля', 'дойде', 'вчера', 'днес', 'скоро', 'нещо', 'документ',
  'документи', 'писмо', 'писма', 'файл', 'файлове', 'трябва', 'трябват', 'последните', 'месеца',
  'месеци', 'който', 'която', 'което', 'имам', 'къде', 'колко', 'какво', 'изтрий', 'премахни',
  'качих', 'качи', 'запази', 'промени', 'моите', 'моя', 'мои', 'ми',
]);

const PRIORITY_TERM_REGEX =
  /kinderzuschlag|wohngeld|kontoauszug|kontoauszüge|steuer|mietvertrag|elterngeld|familienkasse|finanzamt|sparkasse|jobcenter|bescheid|antrag/i;

export const extractKeywordTerms = (message: string): readonly string[] => {
  const tokens = message
    .split(/[^\p{L}\p{N}-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !BG_STOPWORDS.has(token.toLowerCase()));

  const unique = [...new Set(tokens)];
  const priority = unique.filter((token) => PRIORITY_TERM_REGEX.test(token));
  const rest = unique
    .filter((token) => !priority.includes(token))
    .sort((a, b) => b.length - a.length);
  return [...priority, ...rest].slice(0, 3);
};

export const extractMonthsBack = (message: string): number | null => {
  const match = message.match(/(?:последните|последни|през последните)\s+(\d{1,2})\s+месец/i);
  if (!match?.[1]) {
    return null;
  }
  const months = Number(match[1]);
  return Number.isInteger(months) && months >= 1 && months <= 36 ? months : null;
};

export const buildFallbackVaultPlan = (input: PlanVaultActionInput): VaultPlan => {
  const terms = extractKeywordTerms(input.message);
  const base = vaultPlanSchema.parse({
    semanticQuery: input.message.slice(0, 300),
    searchTerms: [...terms],
    monthsBack: extractMonthsBack(input.message),
    factQuery: terms.join(' '),
  });

  switch (input.intent) {
    case 'save_or_update_document':
      return { ...base, action: input.hasAttachment ? 'save_attachment' : 'search_documents' };
    case 'delete_document':
      return { ...base, action: 'delete_documents' };
    case 'manage_fact':
      return { ...base, action: 'list_facts' };
    default:
      return { ...base, action: 'search_documents' };
  }
};

export interface PlanVaultActionResult {
  readonly plan: VaultPlan;
  readonly aiAvailable: boolean;
}

export const planVaultAction = async (
  input: PlanVaultActionInput,
  invoker?: LlmTextInvoker
): Promise<PlanVaultActionResult> => {
  try {
    const plan = await callJsonModel({
      schema: vaultPlanSchema,
      system: PLAN_SYSTEM_PROMPT,
      user: JSON.stringify({
        today: input.nowIso.slice(0, 10),
        intentHint: input.intent,
        hasAttachment: input.hasAttachment,
        ingestedAttachment: input.ingestedAttachment
          ? {
              title: input.ingestedAttachment.title,
              topic: input.ingestedAttachment.topic,
              docType: input.ingestedAttachment.docType,
              summaryText: input.ingestedAttachment.summaryText,
            }
          : null,
        previousAgentState: input.previousAgentState ?? null,
        recentMessages: input.history.slice(-4),
        message: input.message,
      }),
      model: getAiModelsConfig().chatFast,
      invoker,
    });
    return { plan, aiAvailable: true };
  } catch {
    return { plan: buildFallbackVaultPlan(input), aiAvailable: false };
  }
};

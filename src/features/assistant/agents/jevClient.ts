import 'server-only';
import { getAiModelsConfig, JEV_TIMEOUT_MS, OPENROUTER_ENDPOINTS } from '@/config/aiModelsConfig';
import {
  type AssistantDepartment,
  type AssistantIntent,
} from '../schemas/assistantSchema';
import {
  jevDecisionResponseSchema,
  routingDecisionSchema,
  type JevDecisionResponse,
  type RoutingDecision,
  type ZoneCandidate,
} from '../schemas/jevSchema';

export interface JevQuestion {
  readonly type: 'choice' | 'score' | 'noul';
  readonly instructions: string;
  readonly criteria: Readonly<Record<string, string>> | readonly string[];
}

export const INTENT_CRITERIA: Readonly<Record<AssistantIntent, string>> = {
  search_documents: 'Търсене/намиране на документ, писмо или файл в сейфа (напр. „дойде ми нещо за Kinderzuschlag“).',
  save_or_update_document: 'Запазване на прикачен документ в сейфа или промяна на заглавие/тема/дата на документ.',
  delete_document: 'Изтриване на документ от сейфа.',
  manage_fact: 'Показване, добавяне, промяна или изтриване на личен факт (Steuer-ID, IBAN, Kaltmiete, адрес).',
  manage_secret: 'Работа с парола, ПИН или тайна (показване, добавяне, промяна, изтриване).',
  portal_assist: 'Помощ за немски онлайн портал или формуляр (Wohngeld, Kinderzuschlag) — скрийншот, въпроси, нужни документи.',
  letter_or_form: 'Разчитане на писмо от служба, срок, или попълване на PDF молба (Antrag, Bescheid).',
  draft_reply: 'Съставяне на официален отговор или Widerspruch на немски.',
  general_chat: 'Общ въпрос, който не изисква достъп до документи или данни.',
};

const buildJevHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'X-Title': 'KRONOS Jev Router',
});

export const callJevDecisions = async (
  state: unknown,
  questions: Readonly<Record<string, JevQuestion>>,
  fetchImpl: typeof fetch = globalThis.fetch,
  timeoutMs: number = JEV_TIMEOUT_MS
): Promise<JevDecisionResponse> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Липсва OPENROUTER_API_KEY за Jev.');
  }

  const response = await fetchImpl(OPENROUTER_ENDPOINTS.decisions, {
    method: 'POST',
    headers: buildJevHeaders(apiKey),
    body: JSON.stringify({
      model: getAiModelsConfig().jevDispatcher,
      state,
      questions,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Jev Decisions грешка (HTTP ${response.status}).`);
  }

  const rawBody: unknown = await response.json();
  const parsed = jevDecisionResponseSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new Error('Невалиден отговор от Jev Decisions.');
  }
  return parsed.data;
};

export interface JevRoutingInput {
  readonly message: string;
  readonly hasAttachment: boolean;
  readonly departmentCriteria: Readonly<Record<AssistantDepartment, string>>;
  readonly nowIso: string;
}

export const decideRoutingWithJev = async (
  input: JevRoutingInput,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<RoutingDecision> => {
  const result = await callJevDecisions(
    {
      today: input.nowIso.slice(0, 10),
      userMessage: input.message,
      hasAttachment: input.hasAttachment,
    },
    {
      department: {
        type: 'choice',
        instructions: 'Кой специализиран субагент трябва да обработи съобщението на потребителя?',
        criteria: input.departmentCriteria,
      },
      intent: {
        type: 'choice',
        instructions: 'Какво е основното намерение на потребителя?',
        criteria: INTENT_CRITERIA,
      },
    },
    fetchImpl
  );

  const department = result.answers.department?.choice;
  const intent = result.answers.intent?.choice;
  const parsed = routingDecisionSchema.safeParse({ department, intent });
  if (!parsed.success) {
    throw new Error('Jev върна неразпознат субагент или намерение.');
  }
  return parsed.data;
};

export const MAX_RERANK_CANDIDATES = 25;
const NONE_KEY = 'none';
const SECOND_PICK_MIN_PROBABILITY = 0.25;
const SECOND_PICK_MAX_TOP_PROBABILITY = 0.8;

const describeCandidate = (candidate: ZoneCandidate): string => {
  const parts = [
    `Заглавие: ${candidate.title}`,
    `Тема: ${candidate.topic}`,
    candidate.sender ? `Подател: ${candidate.sender}` : '',
    `Дата на документа: ${candidate.docDate ?? 'неизвестна'}`,
    `Качен на: ${candidate.createdAt.slice(0, 10)}`,
    candidate.summaryText ? `Резюме: ${candidate.summaryText.slice(0, 220)}` : '',
  ];
  return parts.filter(Boolean).join(' | ');
};

export const selectZone1FromProbabilities = (
  probabilities: Readonly<Record<string, number>>,
  keyToId: ReadonlyMap<string, string>
): readonly string[] => {
  const ranked = Object.entries(probabilities)
    .filter(([key]) => key === NONE_KEY || keyToId.has(key))
    .sort((a, b) => b[1] - a[1]);

  const top = ranked[0];
  if (!top || top[0] === NONE_KEY) {
    return [];
  }

  const ids: string[] = [];
  const topId = keyToId.get(top[0]);
  if (topId) {
    ids.push(topId);
  }

  const second = ranked[1];
  if (
    second &&
    second[0] !== NONE_KEY &&
    second[1] >= SECOND_PICK_MIN_PROBABILITY &&
    top[1] < SECOND_PICK_MAX_TOP_PROBABILITY
  ) {
    const secondId = keyToId.get(second[0]);
    if (secondId) {
      ids.push(secondId);
    }
  }
  return ids;
};

export const rerankZone1WithJev = async (
  candidates: readonly ZoneCandidate[],
  userMessage: string,
  nowIso: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<readonly string[]> => {
  const limited = candidates.slice(0, MAX_RERANK_CANDIDATES);
  if (limited.length === 0) {
    return [];
  }

  const keyToId = new Map<string, string>();
  const criteria: Record<string, string> = {};
  limited.forEach((candidate, index) => {
    const key = `doc_${index + 1}`;
    keyToId.set(key, candidate.id);
    criteria[key] = describeCandidate(candidate);
  });
  criteria[NONE_KEY] = 'Нито един от документите не съответства уверено на описанието.';

  const result = await callJevDecisions(
    { today: nowIso.slice(0, 10), userRequest: userMessage },
    {
      top: {
        type: 'choice',
        instructions:
          'Кой документ най-точно отговаря на описанието на потребителя? Вземи предвид темата, подателя и времевите намеци (вчера, скоро, миналия месец) спрямо днешната дата — както по дата на документа, така и по дата на качване.',
        criteria,
      },
    },
    fetchImpl
  );

  const answer = result.answers.top;
  const probabilities =
    answer?.probabilities ?? (answer?.choice ? { [answer.choice]: 1 } : null);
  if (!probabilities) {
    throw new Error('Jev не върна вероятности за Зона 1.');
  }
  return selectZone1FromProbabilities(probabilities, keyToId);
};

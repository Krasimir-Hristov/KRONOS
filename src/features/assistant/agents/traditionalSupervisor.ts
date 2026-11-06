import 'server-only';
import { callJsonModel, type LlmTextInvoker } from '@/lib/ai/llmJsonService';
import {
  ASSISTANT_DEPARTMENTS,
  ASSISTANT_INTENTS,
  type AssistantDepartment,
  type AssistantTier,
  type ChatAttachmentInput,
} from '../schemas/assistantSchema';
import { routingDecisionSchema, type RoutingDecision } from '../schemas/jevSchema';
import { classifyByKeywords } from './keywordClassifier';

export interface SupervisorRouteInput {
  readonly message: string;
  readonly attachment: ChatAttachmentInput | null;
  readonly nowIso: string;
  readonly departmentCriteria: Readonly<Record<AssistantDepartment, string>>;
}

export interface SupervisorRouteOutcome extends RoutingDecision {
  readonly tier: AssistantTier;
}

const ROUTER_TIMEOUT_MS = 12_000;

const buildRouterSystemPrompt = (
  criteria: Readonly<Record<AssistantDepartment, string>>
): string => {
  const departmentLines = ASSISTANT_DEPARTMENTS.map(
    (key) => `- "${key}": ${criteria[key]}`
  ).join('\n');
  return [
    'Ти си маршрутизатор (Supervisor) на системата KRONOS. Избери един субагент и едно намерение за съобщението.',
    `Субагенти:\n${departmentLines}`,
    `Допустими намерения: ${ASSISTANT_INTENTS.join(', ')}.`,
    'Върни САМО JSON във формат {"department":"...","intent":"..."} без друг текст.',
  ].join('\n\n');
};

export const routeWithTraditionalSupervisor = async (
  input: SupervisorRouteInput,
  invoker?: LlmTextInvoker
): Promise<SupervisorRouteOutcome> => {
  try {
    const decision = await callJsonModel({
      schema: routingDecisionSchema,
      system: buildRouterSystemPrompt(input.departmentCriteria),
      user: JSON.stringify({
        today: input.nowIso.slice(0, 10),
        hasAttachment: input.attachment !== null,
        message: input.message,
      }),
      timeoutMs: ROUTER_TIMEOUT_MS,
      invoker,
    });
    return { ...decision, tier: 'backup' };
  } catch {
    // Tier 3: OpenRouter is unreachable — deterministic keyword routing keeps the bot usable.
    const decision = classifyByKeywords({
      message: input.message,
      attachment: input.attachment,
    });
    return { ...decision, tier: 'offline' };
  }
};

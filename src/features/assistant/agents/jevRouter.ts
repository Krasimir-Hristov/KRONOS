import 'server-only';
import { decideRoutingWithJev } from './jevClient';
import { classifyByKeywords, isSecretIntentMessage } from './keywordClassifier';
import {
  routeWithTraditionalSupervisor,
  type SupervisorRouteInput,
  type SupervisorRouteOutcome,
} from './traditionalSupervisor';
import type { LlmTextInvoker } from '@/lib/ai/llmJsonService';

export interface JevRouterDeps {
  readonly fetchImpl?: typeof fetch;
  readonly invoker?: LlmTextInvoker;
}

/**
 * Tier 1: Jev Decisions routing (1.5s timeout). Any failure falls through to the
 * Tier 2 traditional OpenRouter supervisor (which itself degrades to Tier 3 keywords).
 * Messages that look like they contain secrets never leave the server: they are routed locally.
 */
export const routeWithJev = async (
  input: SupervisorRouteInput,
  deps: JevRouterDeps = {}
): Promise<SupervisorRouteOutcome> => {
  if (isSecretIntentMessage(input.message)) {
    const decision = classifyByKeywords({
      message: input.message,
      attachment: input.attachment,
    });
    return { ...decision, tier: 'local' };
  }

  try {
    const decision = await decideRoutingWithJev(
      {
        message: input.message,
        hasAttachment: input.attachment !== null,
        departmentCriteria: input.departmentCriteria,
        nowIso: input.nowIso,
      },
      deps.fetchImpl
    );
    return { ...decision, tier: 'jev' };
  } catch {
    return routeWithTraditionalSupervisor(input, deps.invoker);
  }
};

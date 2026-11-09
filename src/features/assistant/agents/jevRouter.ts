import 'server-only';
import { decideRoutingWithJev } from './jevClient';
import { classifyByKeywords, isSecretIntentMessage } from './keywordClassifier';
import { buildAttachmentRoutingDigest } from './supervisorIngestion';
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
 * Tier 1: Jev Decisions routing (1.5s timeout) receiving both the user message and the
 * Supervisor's pre-ingested attachment digest. Any failure falls through to the Tier 2
 * traditional OpenRouter supervisor (which itself degrades to Tier 3 keywords).
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
      ingestedAttachment: input.ingestedAttachment,
    });
    return { ...decision, tier: 'local' };
  }

  const attachmentDigest =
    input.attachmentDigest ??
    buildAttachmentRoutingDigest(input.ingestedAttachment ?? null, input.attachment);

  try {
    const decision = await decideRoutingWithJev(
      {
        message: input.message,
        hasAttachment: input.attachment !== null,
        attachmentDigest,
        departmentCriteria: input.departmentCriteria,
        nowIso: input.nowIso,
      },
      deps.fetchImpl
    );
    return { ...decision, tier: 'jev' };
  } catch {
    return routeWithTraditionalSupervisor(
      { ...input, attachmentDigest },
      deps.invoker
    );
  }
};

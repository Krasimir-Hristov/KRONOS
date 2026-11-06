import { z } from 'zod';
import { assistantDepartmentSchema, assistantIntentSchema } from './assistantSchema';

const jevAnswerSchema = z.looseObject({
  type: z.string().optional(),
  choice: z.string().optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
  confidence: z.number().optional(),
  score: z.number().optional(),
  noul: z.number().optional(),
});

export const jevDecisionResponseSchema = z.object({
  answers: z.record(z.string(), jevAnswerSchema),
});

export type JevDecisionResponse = z.infer<typeof jevDecisionResponseSchema>;
export type JevAnswer = z.infer<typeof jevAnswerSchema>;

const VAULT_ONLY_INTENTS = new Set([
  'search_documents',
  'save_or_update_document',
  'delete_document',
  'manage_fact',
  'manage_secret',
]);

const BUREAUCRACY_ONLY_INTENTS = new Set([
  'portal_assist',
  'letter_or_form',
  'draft_reply',
]);

export const routingDecisionSchema = z
  .object({
    department: assistantDepartmentSchema,
    intent: assistantIntentSchema,
  })
  .transform((val) => {
    if (VAULT_ONLY_INTENTS.has(val.intent)) {
      return { department: 'vault_search_and_manage' as const, intent: val.intent };
    }
    if (BUREAUCRACY_ONLY_INTENTS.has(val.intent)) {
      return { department: 'german_bureaucracy' as const, intent: val.intent };
    }
    return val;
  });

export type RoutingDecision = z.infer<typeof routingDecisionSchema>;

export const zoneCandidateSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  topic: z.string(),
  sender: z.string(),
  docDate: z.string().nullable(),
  createdAt: z.string(),
  summaryText: z.string(),
});

export type ZoneCandidate = z.infer<typeof zoneCandidateSchema>;

export type JevRerankStatus = 'ok' | 'skipped' | 'timeout' | 'error';

export interface ZoneSplit {
  readonly zone1Ids: readonly string[];
  readonly zone2Ids: readonly string[];
  readonly usedJev: boolean;
  readonly jevStatus: JevRerankStatus;
}

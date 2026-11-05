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

export const routingDecisionSchema = z.object({
  department: assistantDepartmentSchema,
  intent: assistantIntentSchema,
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

export interface ZoneSplit {
  readonly zone1Ids: readonly string[];
  readonly zone2Ids: readonly string[];
  readonly usedJev: boolean;
}

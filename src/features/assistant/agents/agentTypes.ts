import type { AssistantTier, AssistantTurnPayload } from '../schemas/assistantSchema';
import type { VaultPlan } from './vaultAgentPlanner';

export interface HandlerOutput {
  readonly replyText: string;
  readonly payload?: Partial<AssistantTurnPayload>;
  readonly zone1Ids?: readonly string[];
  readonly zone2Ids?: readonly string[];
}

export interface VaultHandlerContext {
  readonly message: string;
  readonly nowIso: string;
  readonly plan: VaultPlan;
  readonly tier: AssistantTier;
}

import 'server-only';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { LANGGRAPH_MAX_STEPS } from '@/config/aiModelsConfig';
import { KronosGraphAnnotation } from '@/lib/ai/openRouterGraphConfig';
import {
  assistantTurnResultSchema,
  emptyTurnPayload,
  type AssistantDepartment,
  type AssistantIntent,
  type AssistantTier,
  type AssistantTurnResult,
  type ChatAttachmentInput,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import { germanBureaucracyAgent } from './germanBureaucracyAgent';
import { routeWithJev, type JevRouterDeps } from './jevRouter';
import { vaultSearchAndManageAgent } from './vaultSearchAndManageAgent';

export const SUBAGENT_REGISTRY: Readonly<Record<AssistantDepartment, SubAgentManifest>> = {
  vault_search_and_manage: vaultSearchAndManageAgent,
  german_bureaucracy: germanBureaucracyAgent,
};

export const getDepartmentCriteriaMap = (): Readonly<Record<AssistantDepartment, string>> => ({
  vault_search_and_manage: SUBAGENT_REGISTRY.vault_search_and_manage.jevCriteria,
  german_bureaucracy: SUBAGENT_REGISTRY.german_bureaucracy.jevCriteria,
});

const SupervisorGraphAnnotation = Annotation.Root({
  ...KronosGraphAnnotation.spec,
  userMessage: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  attachment: Annotation<ChatAttachmentInput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  history: Annotation<readonly { readonly role: 'user' | 'assistant'; readonly content: string }[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  nowIso: Annotation<string>({
    reducer: (_, next) => next,
    default: () => new Date().toISOString(),
  }),
  routedIntent: Annotation<AssistantIntent>({
    reducer: (_, next) => next,
    default: () => 'search_documents',
  }),
  routedTier: Annotation<AssistantTier>({
    reducer: (_, next) => next,
    default: () => 'jev',
  }),
  turnResult: Annotation<AssistantTurnResult | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

type SupervisorGraphState = typeof SupervisorGraphAnnotation.State;

export interface RunKronosSupervisorInput {
  readonly message: string;
  readonly attachment: ChatAttachmentInput | null;
  readonly history: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
  readonly nowIso?: string;
}

export interface SupervisorGraphDeps extends JevRouterDeps {
  readonly registry?: Readonly<Record<AssistantDepartment, SubAgentManifest>>;
}

export const runKronosSupervisorGraph = async (
  input: RunKronosSupervisorInput,
  deps: SupervisorGraphDeps = {}
): Promise<AssistantTurnResult> => {
  const registry = deps.registry ?? SUBAGENT_REGISTRY;
  const nowIso = input.nowIso ?? new Date().toISOString();

  const supervisorNode = async (state: SupervisorGraphState) => {
    const routed = await routeWithJev(
      {
        message: state.userMessage,
        attachment: state.attachment,
        nowIso: state.nowIso,
        departmentCriteria: {
          vault_search_and_manage: registry.vault_search_and_manage.jevCriteria,
          german_bureaucracy: registry.german_bureaucracy.jevCriteria,
        },
      },
      deps
    );

    return {
      routedDepartment: routed.department,
      routedIntent: routed.intent,
      routedTier: routed.tier,
      stepCount: 1,
    };
  };

  const buildSubagentNode = (department: AssistantDepartment) => {
    return async (state: SupervisorGraphState) => {
      const manifest = registry[department];
      const result = await manifest.execute({
        message: state.userMessage,
        intent: state.routedIntent,
        tier: state.routedTier,
        attachment: state.attachment,
        history: [...state.history],
        nowIso: state.nowIso,
      });

      return {
        messages: [new AIMessage(result.replyText)],
        zone1DocumentIds: [...result.zone1DocumentIds],
        zone2DocumentIds: [...result.zone2DocumentIds],
        turnResult: result,
        stepCount: 1,
      };
    };
  };

  const workflow = new StateGraph(SupervisorGraphAnnotation)
    .addNode('supervisor', supervisorNode)
    .addNode('vault_search_and_manage', buildSubagentNode('vault_search_and_manage'))
    .addNode('german_bureaucracy', buildSubagentNode('german_bureaucracy'))
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', (state: SupervisorGraphState) => {
      if (state.stepCount >= LANGGRAPH_MAX_STEPS) {
        return END;
      }
      return state.routedDepartment === 'german_bureaucracy'
        ? 'german_bureaucracy'
        : 'vault_search_and_manage';
    })
    .addEdge('vault_search_and_manage', END)
    .addEdge('german_bureaucracy', END);

  const compiled = workflow.compile();
  const finalState = await compiled.invoke(
    {
      messages: [new HumanMessage(input.message || '[Прикачен файл]')],
      userMessage: input.message,
      attachment: input.attachment,
      history: input.history,
      nowIso,
    },
    { recursionLimit: LANGGRAPH_MAX_STEPS + 2 }
  );

  if (finalState.turnResult) {
    return assistantTurnResultSchema.parse(finalState.turnResult);
  }

  return assistantTurnResultSchema.parse({
    replyText:
      'Заявката надхвърли максималния брой стъпки. Моля, задайте по-конкретен въпрос.',
    payload: emptyTurnPayload(),
    zone1DocumentIds: [],
    zone2DocumentIds: [],
  });
};

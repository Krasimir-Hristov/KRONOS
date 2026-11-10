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
  type IngestedAttachmentContext,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import { generalChatAgent } from './generalChatAgent';
import { germanBureaucracyAgent } from './germanBureaucracyAgent';
import { routeWithJev, type JevRouterDeps } from './jevRouter';
import {
  buildAttachmentRoutingDigest,
  ingestAttachmentForSupervisor,
  type SupervisorIngestionDeps,
} from './supervisorIngestion';
import { CONVERSATIONAL_DELETE_CONFIRM_REGEX } from './vaultDocumentHandlers';
import { vaultSearchAndManageAgent } from './vaultSearchAndManageAgent';

export type AgentStatesByDepartment = Readonly<
  Partial<Record<AssistantDepartment, Readonly<Record<string, unknown>>>>
>;

export const SUBAGENT_REGISTRY: Readonly<Record<AssistantDepartment, SubAgentManifest>> = {
  general_chat: generalChatAgent,
  vault_search_and_manage: vaultSearchAndManageAgent,
  german_bureaucracy: germanBureaucracyAgent,
};

export const getDepartmentCriteriaMap = (
  registry: Readonly<Record<AssistantDepartment, SubAgentManifest>> = SUBAGENT_REGISTRY
): Readonly<Record<AssistantDepartment, string>> => ({
  general_chat: registry.general_chat.jevCriteria,
  vault_search_and_manage: registry.vault_search_and_manage.jevCriteria,
  german_bureaucracy: registry.german_bureaucracy.jevCriteria,
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
  ingestedAttachment: Annotation<IngestedAttachmentContext | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  agentStatesByDepartment: Annotation<AgentStatesByDepartment>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  activeAgentPrevState: Annotation<Readonly<Record<string, unknown>> | null>({
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
  readonly ingestedAttachment?: IngestedAttachmentContext | null;
  readonly agentStatesByDepartment?: AgentStatesByDepartment;
  readonly history: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
  readonly nowIso?: string;
}

export interface SupervisorGraphDeps extends JevRouterDeps, SupervisorIngestionDeps {
  readonly registry?: Readonly<Partial<Record<AssistantDepartment, SubAgentManifest>>>;
}

const DELETE_PROMPT_HISTORY_REGEX =
  /(?:Намерих следното за изтриване|Потвърдете,\s+за\s+да\s+(?:го|ги)\s+изтрия\s+завинаги)/i;

export const runKronosSupervisorGraph = async (
  input: RunKronosSupervisorInput,
  deps: SupervisorGraphDeps = {}
): Promise<AssistantTurnResult> => {
  const registry: Readonly<Record<AssistantDepartment, SubAgentManifest>> = {
    ...SUBAGENT_REGISTRY,
    ...deps.registry,
  };
  const nowIso = input.nowIso ?? new Date().toISOString();

  const supervisorNode = async (state: SupervisorGraphState) => {
    const vaultPrevState = state.agentStatesByDepartment.vault_search_and_manage ?? null;
    const lastAssistantTurn = [...state.history]
      .reverse()
      .find((m) => m.role === 'assistant');
    const isDeletePromptActive =
      Boolean(vaultPrevState?.pendingConfirmDelete) &&
      Boolean(lastAssistantTurn && DELETE_PROMPT_HISTORY_REGEX.test(lastAssistantTurn.content));

    if (
      isDeletePromptActive &&
      CONVERSATIONAL_DELETE_CONFIRM_REGEX.test(state.userMessage.trim())
    ) {
      return {
        ingestedAttachment: state.ingestedAttachment,
        routedDepartment: 'vault_search_and_manage' as const,
        routedIntent: 'delete_document' as const,
        routedTier: 'local' as const,
        activeAgentPrevState: vaultPrevState,
        stepCount: 1,
      };
    }

    const ingested =
      state.ingestedAttachment ??
      (state.attachment
        ? await ingestAttachmentForSupervisor(state.attachment, deps)
        : null);

    const attachmentDigest = buildAttachmentRoutingDigest(ingested, state.attachment);

    const routed = await routeWithJev(
      {
        message: state.userMessage,
        attachment: state.attachment,
        ingestedAttachment: ingested,
        attachmentDigest,
        nowIso: state.nowIso,
        departmentCriteria: getDepartmentCriteriaMap(registry),
      },
      deps
    );

    const rawPrevState = state.agentStatesByDepartment[routed.department] ?? null;
    const prevState =
      routed.department === 'vault_search_and_manage' &&
      rawPrevState?.pendingConfirmDelete &&
      !isDeletePromptActive
        ? { ...rawPrevState, pendingConfirmDelete: null }
        : rawPrevState;

    return {
      ingestedAttachment: ingested,
      routedDepartment: routed.department,
      routedIntent: routed.intent,
      routedTier: routed.tier,
      activeAgentPrevState: prevState,
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
        ingestedAttachment: state.ingestedAttachment,
        previousAgentState: state.activeAgentPrevState,
        history: [...state.history],
        nowIso: state.nowIso,
      });

      return {
        turnResult: result,
        stepCount: 1,
      };
    };
  };

  const supervisorFinalizeNode = async (state: SupervisorGraphState) => {
    if (!state.turnResult) {
      return { stepCount: 1 };
    }
    const validated = assistantTurnResultSchema.parse(state.turnResult);
    const dept = (validated.payload.department ??
      state.routedDepartment) as AssistantDepartment;
    const nextSnapshot = validated.payload.agentStateSnapshot;

    return {
      messages: [new AIMessage(validated.replyText)],
      zone1DocumentIds: [...validated.zone1DocumentIds],
      zone2DocumentIds: [...validated.zone2DocumentIds],
      agentStatesByDepartment: nextSnapshot ? { [dept]: nextSnapshot } : {},
      turnResult: validated,
      stepCount: 1,
    };
  };

  const workflow = new StateGraph(SupervisorGraphAnnotation)
    .addNode('supervisor', supervisorNode)
    .addNode('general_chat', buildSubagentNode('general_chat'))
    .addNode('vault_search_and_manage', buildSubagentNode('vault_search_and_manage'))
    .addNode('german_bureaucracy', buildSubagentNode('german_bureaucracy'))
    .addNode('supervisor_finalize', supervisorFinalizeNode)
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', (state: SupervisorGraphState) => {
      if (state.stepCount >= LANGGRAPH_MAX_STEPS) {
        return END;
      }
      if (state.routedDepartment === 'german_bureaucracy') {
        return 'german_bureaucracy';
      }
      if (state.routedDepartment === 'general_chat') {
        return 'general_chat';
      }
      return 'vault_search_and_manage';
    })
    .addEdge('general_chat', 'supervisor_finalize')
    .addEdge('vault_search_and_manage', 'supervisor_finalize')
    .addEdge('german_bureaucracy', 'supervisor_finalize')
    .addEdge('supervisor_finalize', END);

  const compiled = workflow.compile();
  const finalState = await compiled.invoke(
    {
      messages: [new HumanMessage(input.message || '[Прикачен файл]')],
      userMessage: input.message,
      attachment: input.attachment,
      ingestedAttachment: input.ingestedAttachment ?? null,
      agentStatesByDepartment: input.agentStatesByDepartment ?? {},
      history: input.history,
      nowIso,
    },
    { recursionLimit: LANGGRAPH_MAX_STEPS + 3 }
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

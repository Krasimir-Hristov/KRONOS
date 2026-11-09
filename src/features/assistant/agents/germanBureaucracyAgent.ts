import 'server-only';
import type { VaultFactItem } from '@/features/vault';
import { listVaultFacts } from '@/features/vault/server';
import {
  buildVisionSourceFromAttachment,
  saveAttachmentToVault,
} from '../dal/assistantAttachmentDal';
import {
  agentExecutionInputSchema,
  assistantTurnPayloadSchema,
  assistantTurnResultSchema,
  type AgentExecutionRawInput,
  type AssistantActionCard,
  type AssistantTurnResult,
  type FactCard,
  type SubAgentManifest,
} from '../schemas/assistantSchema';
import {
  analyzeBureaucracyRequest,
  type BureaucracyAnalysisDeps,
} from './bureaucracyAnalysis';
import {
  findFactsByQuery,
  MAX_FACT_CARDS,
  selectFactsByLabels,
  toFactCard,
} from './factCards';
import { DEFAULT_DEPARTMENT_CRITERIA } from './jevClient';
import {
  gatherPortalDocuments,
  type PortalDocumentBundle,
} from './portalDocumentGatherer';
import { buildFallbackVaultPlan } from './vaultAgentPlanner';
import { runDocumentSearch, type HybridSearchFn } from './vaultDocumentSearch';
import { sortNewestFirst } from './zoneRanking';

const CORE_PORTAL_FACT_LABELS = [
  'steuer',
  'iban',
  'kindergeld',
  'miete',
  'kaltmiete',
  'warmmiete',
  'адрес',
  'anschrift',
  'aktenzeichen',
] as const;

const OFFLINE_BUREAUCRACY_NOTICE =
  'AI моделът за анализ на формуляри и писма е временно недостъпен в OpenRouter. По-долу извлякох локално вашите запазени лични данни и свързани документи от сейфа, които работят на 100% без AI.';

export interface GermanBureaucracyAgentDeps extends BureaucracyAnalysisDeps {
  readonly loadFacts?: () => Promise<readonly VaultFactItem[]>;
  readonly search?: HybridSearchFn;
  readonly buildVisionSource?: typeof buildVisionSourceFromAttachment;
  readonly saveAttachment?: typeof saveAttachmentToVault;
}

const collectRelevantFactCards = (
  allFacts: readonly VaultFactItem[],
  neededLabels: readonly string[],
  userMessage: string,
  includeCorePortalDefaults: boolean
): readonly FactCard[] => {
  const byLabels = selectFactsByLabels(allFacts, neededLabels);
  const byMessage = userMessage.trim() ? findFactsByQuery(allFacts, userMessage) : [];
  const merged = new Map<string, VaultFactItem>();

  for (const item of [...byLabels, ...byMessage]) {
    merged.set(item.id, item);
  }

  if (merged.size === 0 && includeCorePortalDefaults) {
    for (const item of selectFactsByLabels(allFacts, CORE_PORTAL_FACT_LABELS)) {
      merged.set(item.id, item);
    }
  }

  return [...merged.values()].slice(0, MAX_FACT_CARDS).map(toFactCard);
};

export const executeGermanBureaucracyAgent = async (
  rawInput: AgentExecutionRawInput,
  deps: GermanBureaucracyAgentDeps = {}
): Promise<AssistantTurnResult> => {
  const input = agentExecutionInputSchema.parse(rawInput);
  const loadFacts = deps.loadFacts ?? listVaultFacts;
  const buildSource = deps.buildVisionSource ?? buildVisionSourceFromAttachment;
  const saveAttach = deps.saveAttachment ?? saveAttachmentToVault;

  const actions: AssistantActionCard[] = [];
  let allFacts: readonly VaultFactItem[] = [];

  try {
    allFacts = await loadFacts();
  } catch (err) {
    console.error('[GermanBureaucracyAgent] Failed to load vault facts:', err);
  }

  if (input.attachment?.saveToVault) {
    try {
      const saved = await saveAttach(input.attachment);
      actions.push({
        kind: 'notice',
        tone: saved.aiError ? 'warning' : 'success',
        text: saved.alreadyExisted
          ? `Документът „${saved.title}“ вече е в Документния Сейф.`
          : `Копие от „${saved.title}“ е добавено в опашката за одобрение в Документния Сейф.`,
        documentId: saved.documentId,
      });
    } catch (err) {
      console.error('[GermanBureaucracyAgent] Failed to save attachment:', err);
      actions.push({
        kind: 'notice',
        tone: 'warning',
        text: 'Прикаченият файл не можа да бъде записан в Документния Сейф.',
        documentId: null,
      });
    }
  }

  try {
    const visionSource =
      input.attachment && !input.ingestedAttachment
        ? await buildSource(input.attachment)
        : null;
    const analysis = await analyzeBureaucracyRequest(
      {
        message: input.message,
        intent: input.intent,
        nowIso: input.nowIso,
        availableFactLabels: allFacts.map((f) => f.label),
        history: input.history,
        source: visionSource,
        ingestedAttachment: input.ingestedAttachment,
        previousAgentState: input.previousAgentState,
      },
      deps
    );

    const matchedFacts = collectRelevantFactCards(
      allFacts,
      analysis.guide?.neededFactLabels ?? [],
      input.message,
      input.intent === 'portal_assist'
    );

    const neededDocs = analysis.guide?.neededDocuments ?? [];
    let bundle: PortalDocumentBundle = { documentIds: [], shortfallNotes: [] };
    if (neededDocs.length > 0) {
      try {
        bundle = await gatherPortalDocuments(neededDocs, input.nowIso, deps.search);
      } catch (searchErr) {
        console.error(
          '[GermanBureaucracyAgent] Failed to gather portal documents:',
          searchErr
        );
        bundle = {
          documentIds: [],
          shortfallNotes: [
            'Наличните документи в сейфа не можаха да бъдат проверени автоматично в момента.',
          ],
        };
        actions.push({
          kind: 'notice',
          tone: 'warning',
          text: 'Проверката на документите в сейфа не успя, но анализът е готов.',
          documentId: null,
        });
      }
    }

    const shortfallSuffix =
      bundle.shortfallNotes.length > 0
        ? `\n\nПроверка на наличните файлове в сейфа:\n• ${bundle.shortfallNotes.join('\n• ')}`
        : '';

    const payload = assistantTurnPayloadSchema.parse({
      department: 'german_bureaucracy',
      intent: input.intent,
      tier: input.tier,
      errorCode: null,
      facts: matchedFacts,
      guide: analysis.guide,
      draft: analysis.draft,
      actions,
      portalDocumentIds: bundle.documentIds,
      agentStateSnapshot: {
        lastIntent: input.intent,
        deadline: analysis.guide?.deadline ?? null,
        draftSubject: analysis.draft?.subjectLine ?? null,
        neededFactLabels: analysis.guide?.neededFactLabels ?? [],
        portalDocCount: bundle.documentIds.length,
      },
    });

    return assistantTurnResultSchema.parse({
      replyText: `${analysis.replyBg}${shortfallSuffix}`,
      payload,
      zone1DocumentIds: [],
      zone2DocumentIds: [],
    });
  } catch (err) {
    console.error('[GermanBureaucracyAgent] Falling back to offline vault assist:', err);
    const fallbackFacts = collectRelevantFactCards(
      allFacts,
      [],
      input.message,
      true
    );

    let fallbackDocIds: readonly string[];
    try {
      const fallbackPlan = buildFallbackVaultPlan({
        message: input.message,
        intent: 'search_documents',
        hasAttachment: false,
        nowIso: input.nowIso,
        history: input.history,
      });
      const { docs } = await runDocumentSearch(
        fallbackPlan,
        input.message,
        input.nowIso,
        deps.search,
        { useVector: false }
      );
      fallbackDocIds = sortNewestFirst(docs)
        .slice(0, 12)
        .map((d) => d.id);
    } catch {
      fallbackDocIds = [];
    }

    const payload = assistantTurnPayloadSchema.parse({
      department: 'german_bureaucracy',
      intent: input.intent,
      tier: 'offline',
      errorCode: 'AI_UNAVAILABLE',
      facts: fallbackFacts,
      guide: null,
      draft: null,
      actions,
      portalDocumentIds: fallbackDocIds,
      agentStateSnapshot: null,
    });

    return assistantTurnResultSchema.parse({
      replyText: OFFLINE_BUREAUCRACY_NOTICE,
      payload,
      zone1DocumentIds: [],
      zone2DocumentIds: [],
    });
  }
};

export const germanBureaucracyAgent: SubAgentManifest = {
  agentId: 'germanBureaucracyAgent',
  department: 'german_bureaucracy',
  jevCriteria: DEFAULT_DEPARTMENT_CRITERIA.german_bureaucracy,
  inputSchema: agentExecutionInputSchema,
  outputSchema: assistantTurnResultSchema,
  execute: (input) => executeGermanBureaucracyAgent(input),
};

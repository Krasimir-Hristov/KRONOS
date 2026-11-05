import 'server-only';
import type { CatalogDocumentItem } from '@/features/documents';
import {
  searchDocumentsHybridRag,
  type HybridSearchOutcome,
} from '../dal/assistantRagDal';
import type { VaultPlan } from './vaultAgentPlanner';

const SEARCH_LIMIT_PER_PASS = 30;
const MAX_MERGED_DOCUMENTS = 40;

export const subtractMonthsIso = (nowIso: string, months: number): string => {
  const date = new Date(nowIso);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
};

export interface DocumentSearchOutcome {
  readonly docs: readonly CatalogDocumentItem[];
  readonly usedVector: boolean;
}

export type HybridSearchFn = typeof searchDocumentsHybridRag;

/**
 * Runs one semantic pass (vector + FTS on the full phrase) and one keyword pass per
 * search term (FTS/trigram only), then merges the unique hits in relevance order.
 */
export const runDocumentSearch = async (
  plan: Pick<VaultPlan, 'semanticQuery' | 'searchTerms' | 'topic' | 'monthsBack'>,
  fallbackQuery: string,
  nowIso: string,
  search: HybridSearchFn = searchDocumentsHybridRag
): Promise<DocumentSearchOutcome> => {
  const dateFrom = plan.monthsBack ? subtractMonthsIso(nowIso, plan.monthsBack) : null;
  const semanticQuery = plan.semanticQuery || fallbackQuery;

  const runPasses = async (topic: string | null): Promise<DocumentSearchOutcome> => {
    const semantic = await search({
      query: semanticQuery,
      topic,
      dateFrom,
      limit: SEARCH_LIMIT_PER_PASS,
    });

    const termResults: HybridSearchOutcome[] = [];
    for (const term of plan.searchTerms) {
      termResults.push(
        await search({
          query: term,
          topic,
          dateFrom,
          limit: SEARCH_LIMIT_PER_PASS,
          useVector: false,
        })
      );
    }

    const merged = new Map<string, CatalogDocumentItem>();
    for (const doc of [...semantic.items, ...termResults.flatMap((r) => r.items)]) {
      if (!merged.has(doc.id)) {
        merged.set(doc.id, doc);
      }
    }
    return {
      docs: [...merged.values()].slice(0, MAX_MERGED_DOCUMENTS),
      usedVector: semantic.usedVector,
    };
  };

  const firstPass = await runPasses(plan.topic);
  if (firstPass.docs.length === 0 && plan.topic) {
    return runPasses(null);
  }
  return firstPass;
};

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
  const source = new Date(nowIso);
  const srcYear = source.getUTCFullYear();
  const srcMonth = source.getUTCMonth();
  const srcDay = source.getUTCDate();

  const targetMonthIndex = srcYear * 12 + srcMonth - months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(srcDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay))
    .toISOString()
    .slice(0, 10);
};

export interface DocumentSearchOutcome {
  readonly docs: readonly CatalogDocumentItem[];
  readonly usedVector: boolean;
}

export interface DocumentSearchOptions {
  readonly allowTopicRelaxation?: boolean;
  readonly useVector?: boolean;
}

export type HybridSearchFn = typeof searchDocumentsHybridRag;

/**
 * Runs one semantic pass (vector + FTS on the full phrase) and one keyword pass per
 * search term (FTS/trigram only), then interleaves unique hits in balanced round-robin order.
 */
export const runDocumentSearch = async (
  plan: Pick<VaultPlan, 'semanticQuery' | 'searchTerms' | 'topic' | 'monthsBack'>,
  fallbackQuery: string,
  nowIso: string,
  search: HybridSearchFn = searchDocumentsHybridRag,
  options?: DocumentSearchOptions
): Promise<DocumentSearchOutcome> => {
  const dateFrom = plan.monthsBack ? subtractMonthsIso(nowIso, plan.monthsBack) : null;
  const semanticQuery = plan.semanticQuery || fallbackQuery;

  const runPasses = async (topic: string | null): Promise<DocumentSearchOutcome> => {
    const semantic = await search({
      query: semanticQuery,
      topic,
      dateFrom,
      limit: SEARCH_LIMIT_PER_PASS,
      ...(options?.useVector !== undefined ? { useVector: options.useVector } : {}),
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

    const buckets: readonly (readonly CatalogDocumentItem[])[] = [
      semantic.items,
      ...termResults.map((r) => r.items),
    ];
    const maxBucketLen = buckets.reduce((max, items) => Math.max(max, items.length), 0);
    const merged = new Map<string, CatalogDocumentItem>();

    for (let idx = 0; idx < maxBucketLen && merged.size < MAX_MERGED_DOCUMENTS; idx += 1) {
      for (const bucket of buckets) {
        const doc = bucket[idx];
        if (doc && !merged.has(doc.id)) {
          merged.set(doc.id, doc);
          if (merged.size >= MAX_MERGED_DOCUMENTS) {
            break;
          }
        }
      }
    }

    return {
      docs: [...merged.values()],
      usedVector: semantic.usedVector,
    };
  };

  const firstPass = await runPasses(plan.topic);
  if (
    firstPass.docs.length === 0 &&
    plan.topic &&
    options?.allowTopicRelaxation !== false
  ) {
    return runPasses(null);
  }
  return firstPass;
};

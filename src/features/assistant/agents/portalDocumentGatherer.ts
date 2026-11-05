import 'server-only';
import type { CatalogDocumentItem } from '@/features/documents';
import { DOCUMENT_TOPICS } from '@/lib/ai/documentOcrService';
import type { PortalGuide } from '../schemas/assistantSchema';
import { extractKeywordTerms } from './vaultAgentPlanner';
import { runDocumentSearch, type HybridSearchFn } from './vaultDocumentSearch';
import { sortNewestFirst } from './zoneRanking';

const DEFAULT_DOCS_PER_NEED = 3;
const MAX_DOCS_PER_NEED = 12;
const MAX_PORTAL_DOCUMENTS = 20;

export interface PortalDocumentBundle {
  readonly documentIds: readonly string[];
  readonly shortfallNotes: readonly string[];
}

const resolveSpecificTopic = (rawTopic: string | null) =>
  DOCUMENT_TOPICS.find((topic) => topic === rawTopic && topic !== 'allgemein') ?? null;

export const gatherPortalDocuments = async (
  needs: PortalGuide['neededDocuments'],
  nowIso: string,
  search?: HybridSearchFn
): Promise<PortalDocumentBundle> => {
  const collected = new Map<string, CatalogDocumentItem>();
  const shortfallNotes: string[] = [];

  for (const need of needs) {
    const topic = resolveSpecificTopic(need.topic);
    const keywordTerms = extractKeywordTerms(need.description);
    const { docs } = await runDocumentSearch(
      {
        semanticQuery: need.description,
        searchTerms: topic ? [topic] : [...keywordTerms],
        topic,
        monthsBack: need.monthsBack,
      },
      need.description,
      nowIso,
      search
    );

    const sorted = sortNewestFirst(docs);
    let picked: readonly CatalogDocumentItem[];

    if (need.monthsBack) {
      const wantedMonths = Math.min(need.monthsBack, MAX_DOCS_PER_NEED);
      const byMonth = new Map<string, CatalogDocumentItem>();
      for (const doc of sorted) {
        const monthKey = (doc.docDate ?? doc.createdAt.slice(0, 10)).slice(0, 7);
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, doc);
          if (byMonth.size >= wantedMonths) {
            break;
          }
        }
      }
      picked = [...byMonth.values()];
      if (picked.length < wantedMonths) {
        shortfallNotes.push(
          `„${need.description}“: намерих ${picked.length} от ${wantedMonths} исканите месеца.`
        );
      }
    } else {
      const wanted = Math.min(DEFAULT_DOCS_PER_NEED, MAX_DOCS_PER_NEED);
      picked = sorted.slice(0, wanted);
      if (picked.length === 0) {
        shortfallNotes.push(`„${need.description}“: не намерих такъв документ в сейфа.`);
      }
    }

    for (const doc of picked) {
      collected.set(doc.id, doc);
    }
  }

  return {
    documentIds: [...collected.keys()].slice(0, MAX_PORTAL_DOCUMENTS),
    shortfallNotes,
  };
};

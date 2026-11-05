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

    const wanted = Math.min(need.monthsBack ?? DEFAULT_DOCS_PER_NEED, MAX_DOCS_PER_NEED);
    const picked = sortNewestFirst(docs).slice(0, wanted);
    for (const doc of picked) {
      collected.set(doc.id, doc);
    }

    if (need.monthsBack && picked.length < need.monthsBack) {
      shortfallNotes.push(
        `„${need.description}“: намерих ${picked.length} от ${need.monthsBack} исканите.`
      );
    } else if (picked.length === 0) {
      shortfallNotes.push(`„${need.description}“: не намерих такъв документ в сейфа.`);
    }
  }

  return {
    documentIds: [...collected.keys()].slice(0, MAX_PORTAL_DOCUMENTS),
    shortfallNotes,
  };
};

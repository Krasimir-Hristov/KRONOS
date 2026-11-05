import 'server-only';
import type { CatalogDocumentItem } from '@/features/documents';
import { rerankZone1WithJev } from './jevClient';
import type { ZoneCandidate, ZoneSplit } from '../schemas/jevSchema';

const MAX_ZONE1 = 2;
const MAX_ZONE2 = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

const TIME_HINTS: readonly { readonly regex: RegExp; readonly days: number }[] = [
  { regex: /вчера|gestern/i, days: 2 },
  { regex: /днес|today|heute/i, days: 1 },
  { regex: /тази седмица|последните дни|скоро|наскоро|току-що|ново|последн|neulich|kürzlich/i, days: 8 },
  { regex: /този месец|миналия месец|diesen monat/i, days: 35 },
];

export const toZoneCandidate = (doc: CatalogDocumentItem): ZoneCandidate => ({
  id: doc.id,
  title: doc.title,
  topic: doc.topic,
  sender: doc.sender,
  docDate: doc.docDate,
  createdAt: doc.createdAt,
  summaryText: doc.summaryText,
});

const effectiveDate = (doc: CatalogDocumentItem): string =>
  doc.docDate ?? doc.createdAt.slice(0, 10);

export const sortNewestFirst = (
  docs: readonly CatalogDocumentItem[]
): readonly CatalogDocumentItem[] =>
  [...docs].sort((a, b) => {
    const byDate = effectiveDate(b).localeCompare(effectiveDate(a));
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
  });

const daysBetween = (dateIso: string, nowIso: string): number => {
  const diff = new Date(nowIso).getTime() - new Date(dateIso).getTime();
  return Number.isFinite(diff) ? diff / DAY_MS : Number.POSITIVE_INFINITY;
};

/** Deterministic Zone 1 picker used when Jev is unavailable. Input is in relevance order. */
export const pickZone1Heuristically = (
  docs: readonly CatalogDocumentItem[],
  message: string,
  nowIso: string
): readonly string[] => {
  if (docs.length === 0) {
    return [];
  }
  const hint = TIME_HINTS.find((entry) => entry.regex.test(message));

  const scored = docs.map((doc, index) => {
    const relevance = 1 / (1 + index);
    const ageDays = Math.min(
      daysBetween(doc.createdAt, nowIso),
      doc.docDate ? daysBetween(`${doc.docDate}T00:00:00Z`, nowIso) : Number.POSITIVE_INFINITY
    );
    const recencyBoost = hint && ageDays <= hint.days ? 1 : 0;
    return { id: doc.id, score: relevance + recencyBoost };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) {
    return [];
  }
  const ids = [top.id];
  const second = scored[1];
  if (second && second.score >= top.score * 0.75 && ids.length < MAX_ZONE1) {
    ids.push(second.id);
  }
  return ids;
};

export interface SplitZonesDeps {
  readonly rerank?: typeof rerankZone1WithJev;
}

export const splitIntoZones = async (
  docsInRelevanceOrder: readonly CatalogDocumentItem[],
  message: string,
  nowIso: string,
  deps: SplitZonesDeps = {}
): Promise<ZoneSplit> => {
  if (docsInRelevanceOrder.length === 0) {
    return { zone1Ids: [], zone2Ids: [], usedJev: false };
  }

  let zone1Ids: readonly string[];
  let usedJev = false;

  if (docsInRelevanceOrder.length === 1) {
    zone1Ids = [docsInRelevanceOrder[0]!.id];
  } else {
    try {
      const rerank = deps.rerank ?? rerankZone1WithJev;
      zone1Ids = (
        await rerank(docsInRelevanceOrder.map(toZoneCandidate), message, nowIso)
      ).slice(0, MAX_ZONE1);
      usedJev = true;
    } catch {
      zone1Ids = pickZone1Heuristically(docsInRelevanceOrder, message, nowIso);
    }
  }

  const zone1Set = new Set(zone1Ids);
  const zone2Ids = sortNewestFirst(
    docsInRelevanceOrder.filter((doc) => !zone1Set.has(doc.id))
  )
    .slice(0, MAX_ZONE2)
    .map((doc) => doc.id);

  return { zone1Ids, zone2Ids, usedJev };
};

import type { VaultFactItem } from '@/features/vault';
import type { FactCard } from '../schemas/assistantSchema';

export const MAX_FACT_CARDS = 12;

export const toFactCard = (item: VaultFactItem): FactCard => ({
  id: item.id,
  label: item.label,
  value: item.valuePlain,
  category: item.category,
  sourceDocumentId: item.sourceDocumentId,
  sourceDocumentTitle: item.sourceDocumentTitle,
  sourceDocumentDate: item.sourceDocumentDate,
});

const tokenize = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((token) => token.length >= 2);

const haystackOf = (item: VaultFactItem): string =>
  `${item.label} ${item.valuePlain} ${item.usernameOrHint ?? ''}`.toLowerCase();

/** Returns facts that match at least one token, best matches first. Empty query returns everything. */
export const findFactsByQuery = (
  facts: readonly VaultFactItem[],
  query: string
): readonly VaultFactItem[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return facts;
  }

  return facts
    .map((fact) => {
      const haystack = haystackOf(fact);
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      return { fact, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((entry) => entry.fact);
};

/** Picks facts whose label contains any of the requested labels (e.g. "Steuer-ID", "IBAN"). */
export const selectFactsByLabels = (
  facts: readonly VaultFactItem[],
  requestedLabels: readonly string[]
): readonly VaultFactItem[] => {
  const wanted = requestedLabels.map((label) => label.toLowerCase().trim()).filter(Boolean);
  if (wanted.length === 0) {
    return [];
  }
  const picked = new Map<string, VaultFactItem>();
  for (const fact of facts) {
    const label = fact.label.toLowerCase();
    if (wanted.some((needle) => label.includes(needle) || needle.includes(label))) {
      picked.set(fact.id, fact);
    }
  }
  return [...picked.values()];
};

import { z } from 'zod';
import { isSuspectedSecretFact } from '@/lib/security/secretFactGuard';

export const VAULT_CATEGORIES = [
  'personal',
  'tax',
  'bank',
  'family',
  'housing',
  'health',
  'other',
] as const;

export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

export const vaultCategorySchema = z.enum(VAULT_CATEGORIES);

export const vaultFactInputSchema = z.object({
  category: vaultCategorySchema.default('personal'),
  label: z.string().trim().min(1, 'Етикетът е задължителен.').max(120),
  value: z.string().trim().min(1, 'Стойността е задължителна.').max(1000),
  usernameOrHint: z.string().trim().max(240).nullable().optional(),
  sourceDocumentId: z.string().uuid().nullable().optional(),
});

export const vaultFactUpdateSchema = z.object({
  id: z.string().uuid(),
  category: vaultCategorySchema,
  label: z.string().trim().min(1, 'Етикетът е задължителен.').max(120),
  value: z.string().trim().min(1, 'Стойността е задължителна.').max(1000),
  usernameOrHint: z.string().trim().max(240).nullable().optional(),
});

export const vaultSecretInputSchema = z.object({
  category: vaultCategorySchema.default('personal'),
  label: z.string().trim().min(1, 'Името на услугата/сайта е задължително.').max(120),
  secretValue: z.string().min(1, 'Паролата/тайната е задължителна.').max(2000),
  usernameOrHint: z.string().trim().max(240).nullable().optional(),
});

export const vaultSecretUpdateSchema = z.object({
  id: z.string().uuid(),
  category: vaultCategorySchema,
  label: z.string().trim().min(1, 'Името на услугата/сайта е задължително.').max(120),
  secretValue: z.string().max(2000).optional(),
  usernameOrHint: z.string().trim().max(240).nullable().optional(),
});

export const extractedFactCandidateSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(500),
    category: vaultCategorySchema.catch('other'),
    hint: z.string().trim().max(240).nullable().optional(),
  })
  .refine((item) => !isSuspectedSecretFact(item.label, item.hint), {
    message: 'Пароли и ПИН кодове се съхраняват само криптирани.',
  });

export type VaultFactInput = z.infer<typeof vaultFactInputSchema>;
export type VaultFactUpdateInput = z.infer<typeof vaultFactUpdateSchema>;
export type VaultSecretInput = z.infer<typeof vaultSecretInputSchema>;
export type VaultSecretUpdateInput = z.infer<typeof vaultSecretUpdateSchema>;
export type ExtractedFactCandidate = z.infer<typeof extractedFactCandidateSchema>;

export interface VaultFactItem {
  readonly id: string;
  readonly category: VaultCategory;
  readonly label: string;
  readonly valuePlain: string;
  readonly usernameOrHint: string | null;
  readonly sourceDocumentId: string | null;
  readonly sourceDocumentTitle: string | null;
  readonly sourceDocumentDate: string | null;
  readonly updatedAt: string;
}

export interface VaultSecretMaskedItem {
  readonly id: string;
  readonly category: VaultCategory;
  readonly label: string;
  readonly usernameOrHint: string | null;
  readonly updatedAt: string;
}

const IBAN_COMPACT_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const STEUER_ID_COMPACT_REGEX = /^\d{11}$/;
const KINDERGELD_NR_COMPACT_REGEX = /^\d{3}FK\d{6}$/;

export const normalizeCompactFactValue = (rawValue: string): string => {
  return rawValue.replace(/[\s\-./]+/g, '').toUpperCase();
};

export const normalizeGeneralFactValue = (rawValue: string): string => {
  return rawValue.trim().replace(/\s+/g, ' ').toLowerCase();
};

export const normalizeFactLabel = (rawLabel: string): string => {
  return rawLabel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

export const getStructuredIdentifierKey = (
  label: string,
  rawValue: string
): string | null => {
  const compact = normalizeCompactFactValue(rawValue);
  if (!compact) {
    return null;
  }
  if (IBAN_COMPACT_REGEX.test(compact)) {
    return `id:iban:${compact}`;
  }
  if (KINDERGELD_NR_COMPACT_REGEX.test(compact)) {
    return `id:kg:${compact}`;
  }
  const lowerLabel = normalizeFactLabel(label);
  if (
    STEUER_ID_COMPACT_REGEX.test(compact) &&
    (lowerLabel.includes('steuer') ||
      lowerLabel.includes('данъч') ||
      lowerLabel.includes('idnr'))
  ) {
    return `id:steuer:${compact}`;
  }
  return null;
};

export const isGloballyUniqueIdentifierValue = (
  label: string,
  rawValue: string
): boolean => {
  return getStructuredIdentifierKey(label, rawValue) !== null;
};

export const computeFactDedupKey = (label: string, rawValue: string): string => {
  const structuredKey = getStructuredIdentifierKey(label, rawValue);
  if (structuredKey) {
    return structuredKey;
  }
  return `pair:${normalizeFactLabel(label)}||${normalizeGeneralFactValue(rawValue)}`;
};

export const areFactsDuplicate = (
  existing: { readonly label: string; readonly value: string },
  candidate: { readonly label: string; readonly value: string }
): boolean => {
  if (!existing.value.trim() || !candidate.value.trim()) {
    return false;
  }
  return (
    computeFactDedupKey(existing.label, existing.value) ===
    computeFactDedupKey(candidate.label, candidate.value)
  );
};

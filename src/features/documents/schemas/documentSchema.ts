import { z } from 'zod';
import { vaultCategorySchema, type VaultCategory } from '@/features/vault';
import { isSuspectedSecretFact } from '@/lib/security/secretFactGuard';

export const DOCUMENT_TOPICS = [
  'kinderzuschlag',
  'wohngeld',
  'kontoauszug',
  'steuer',
  'mietvertrag',
  'zivilstand',
  'arbeit',
  'gesundheit',
  'allgemein',
] as const;

export type DocumentTopic = (typeof DOCUMENT_TOPICS)[number];

export const DOCUMENT_TOPIC_LABELS_BG: Record<DocumentTopic, string> = {
  kinderzuschlag: 'Kinderzuschlag / Семейни',
  wohngeld: 'Wohngeld (Жилищни)',
  kontoauszug: 'Kontoauszug (Банкови)',
  steuer: 'Steuer / Finanzamt',
  mietvertrag: 'Наем & Жилище',
  zivilstand: 'Актове (Раждане/Брак)',
  arbeit: 'Работа & Фишове',
  gesundheit: 'Здраве & Каса',
  allgemein: 'Общи документи',
};

export const DOCUMENT_TYPES = [
  'bescheid',
  'antrag',
  'kontoauszug',
  'vertrag',
  'urkunde',
  'rechnung',
  'brief',
  'sonstiges',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS_BG: Record<DocumentType, string> = {
  bescheid: 'Решение (Bescheid)',
  antrag: 'Молба / Формуляр (Antrag)',
  kontoauszug: 'Банково извлечение',
  vertrag: 'Договор (Vertrag)',
  urkunde: 'Удостоверение / Акт',
  rechnung: 'Фактура / Сметка',
  brief: 'Официално писмо',
  sonstiges: 'Друго',
};

export const DOCUMENT_SORT_MODES = [
  'doc_date_desc',
  'doc_date_asc',
  'created_at_desc',
  'created_at_asc',
  'relevance',
] as const;

export type DocumentSortMode = (typeof DOCUMENT_SORT_MODES)[number];

export const CLASSIC_SEARCH_PAGE_SIZE = 50;

export const documentTopicSchema = z.enum(DOCUMENT_TOPICS);
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export const documentSortModeSchema = z.enum(DOCUMENT_SORT_MODES);

export const isValidCalendarIsoDate = (val: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return false;
  }
  const [yStr, mStr, dStr] = val.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
};

export const suggestedFactItemSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(500),
    category: vaultCategorySchema.catch('other'),
    hint: z.string().trim().max(240).nullable().optional(),
  })
  .refine((fact) => !isSuspectedSecretFact(fact.label, fact.hint), {
    message: 'Пароли и ПИН кодове се съхраняват само криптирани в секция Пароли.',
  });

export type SuggestedFactItem = {
  readonly label: string;
  readonly value: string;
  readonly category: VaultCategory;
  readonly hint?: string | null;
};

export const documentReviewMetaSchema = z.object({
  pendingReview: z.boolean().catch(false),
  suggestedFacts: z
    .unknown()
    .transform((raw): SuggestedFactItem[] => {
      if (!Array.isArray(raw)) return [];
      const valid: SuggestedFactItem[] = [];
      for (const item of raw) {
        const res = suggestedFactItemSchema.safeParse(item);
        if (res.success) {
          valid.push(res.data);
        }
      }
      return valid;
    }),
  aiError: z.string().nullable().optional(),
});

export type DocumentReviewMeta = z.infer<typeof documentReviewMetaSchema>;

export const registerPendingDocumentSchema = z.object({
  storagePath: z.string().trim().min(5).max(500),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  fileSizeBytes: z.number().int().positive().max(52_428_800),
});

export const classicDocumentSearchSchema = z.object({
  query: z.string().max(200).default(''),
  topic: z.string().max(60).optional(),
  docType: z.string().max(60).optional(),
  sortBy: documentSortModeSchema.default('doc_date_desc'),
  limit: z.number().int().min(1).max(200).default(CLASSIC_SEARCH_PAGE_SIZE),
  offset: z.number().int().min(0).default(0),
});

const nullableIsoDateSchema = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .pipe(
    z
      .string()
      .refine(isValidCalendarIsoDate, 'Невалидна календарна дата (ГГГГ-ММ-ДД).')
      .nullable()
  );

export const approveDocumentItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Заглавието е задължително.').max(200),
  topic: documentTopicSchema,
  docType: documentTypeSchema,
  sender: z.string().trim().max(160).default(''),
  docDate: nullableIsoDateSchema,
  expiresAt: nullableIsoDateSchema,
  selectedFacts: z.array(suggestedFactItemSchema).max(25).default([]),
});

export const approveDocumentsBatchSchema = z.object({
  items: z.array(approveDocumentItemSchema).min(1).max(50),
});

export const updateDocumentMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Заглавието е задължително.').max(200),
  topic: documentTopicSchema,
  docType: documentTypeSchema,
  sender: z.string().trim().max(160).default(''),
  docDate: nullableIsoDateSchema,
  expiresAt: nullableIsoDateSchema,
});

export type RegisterPendingDocumentInput = z.infer<typeof registerPendingDocumentSchema>;
export type ClassicDocumentSearchInput = z.input<typeof classicDocumentSearchSchema>;
export type ApproveDocumentItemInput = z.infer<typeof approveDocumentItemSchema>;
export type UpdateDocumentMetaInput = z.infer<typeof updateDocumentMetaSchema>;

export interface CatalogDocumentItem {
  readonly id: string;
  readonly title: string;
  readonly topic: DocumentTopic;
  readonly docType: DocumentType;
  readonly sender: string;
  readonly docDate: string | null;
  readonly expiresAt: string | null;
  readonly storagePath: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
  readonly summaryText: string;
  readonly processingStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewMeta: DocumentReviewMeta;
}

const extensionFromMime = (mimeType: string, fallbackName: string): string => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  const ext = fallbackName.split('.').pop()?.toLowerCase();
  return ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'pdf';
};

export const buildPortalFileName = (
  doc: Pick<
    CatalogDocumentItem,
    'docDate' | 'createdAt' | 'topic' | 'title' | 'mimeType' | 'originalFileName'
  >
): string => {
  const datePart = doc.docDate ?? doc.createdAt.slice(0, 10);
  const cleanTitle = doc.title
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁα-ωΑ-Ω0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 55);
  const ext = extensionFromMime(doc.mimeType, doc.originalFileName);
  const safeBase = cleanTitle || doc.topic;
  return `${datePart}_${safeBase}.${ext}`;
};

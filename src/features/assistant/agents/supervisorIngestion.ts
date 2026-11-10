import 'server-only';
import { extractUniversalDocumentContent } from '@/features/ingestion/server';
import type {
  OcrDocumentInput,
  OcrExtractionResult,
} from '@/lib/ai/documentOcrService';
import { buildVisionSourceFromAttachment } from '../dal/assistantAttachmentDal';
import {
  ingestedAttachmentSchema,
  type ChatAttachmentInput,
  type IngestedAttachmentContext,
} from '../schemas/assistantSchema';

export interface SupervisorIngestionDeps {
  readonly buildVisionSource?: (
    attachment: ChatAttachmentInput
  ) => Promise<OcrDocumentInput>;
  readonly extractOcr?: (
    input: OcrDocumentInput,
    fetchImpl?: typeof fetch
  ) => Promise<OcrExtractionResult>;
  readonly fetchImpl?: typeof fetch;
}

const MAX_INGESTED_OCR_TEXT_CHARS = 50_000;

/**
 * Single-pass Pre-Jev Ingestion executed by the Supervisor Agent ONLY when an attachment is present.
 * When attachment is null, returns null immediately (0 ms).
 * If Vision OCR fails (e.g., offline), degrades gracefully to null so routing and fallback still work.
 */
export const ingestAttachmentForSupervisor = async (
  attachment: ChatAttachmentInput | null,
  deps: SupervisorIngestionDeps = {}
): Promise<IngestedAttachmentContext | null> => {
  if (!attachment) {
    return null;
  }

  try {
    const buildSource = deps.buildVisionSource ?? buildVisionSourceFromAttachment;
    const runOcr =
      deps.extractOcr ??
      ((source: OcrDocumentInput, fetchImpl?: typeof fetch) =>
        extractUniversalDocumentContent(source, { fetchImpl }));

    const source = await buildSource(attachment);
    const extracted = await runOcr(source, deps.fetchImpl);

    const parsed = ingestedAttachmentSchema.safeParse({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      title: extracted.title,
      topic: extracted.topic,
      docType: extracted.docType,
      sender: extracted.sender,
      docDate: extracted.docDate,
      expiresAt: extracted.expiresAt,
      summaryText: extracted.summaryText,
      rawOcrText: extracted.rawOcrText.slice(0, MAX_INGESTED_OCR_TEXT_CHARS),
      suggestedFacts: extracted.suggestedFacts,
    });

    if (!parsed.success) {
      const failedPaths = parsed.error.issues
        .map((issue) => issue.path.join('.') || '<root>')
        .join(', ');
      console.warn(
        `[SupervisorIngestion] Validation failed for ingested attachment (${attachment.fileName}) at fields: ${failedPaths}`
      );
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.warn('[SupervisorIngestion] Single-pass pre-Jev ingestion degraded:', err);
    return null;
  }
};

export const buildAttachmentRoutingDigest = (
  ingested: IngestedAttachmentContext | null,
  attachment: ChatAttachmentInput | null
): string | null => {
  if (!attachment) {
    return null;
  }
  if (!ingested) {
    return `Прикачен файл: "${attachment.fileName}" (${attachment.mimeType}, saveToVault=${String(attachment.saveToVault)})`;
  }

  const parts = [
    `Файл: "${ingested.fileName}"`,
    `Заглавие: ${ingested.title}`,
    `Тема: ${ingested.topic}`,
    `Тип: ${ingested.docType}`,
    ingested.sender ? `Подател: ${ingested.sender}` : '',
    ingested.summaryText ? `Резюме: ${ingested.summaryText.slice(0, 320)}` : '',
    `Запази в сейфа: ${attachment.saveToVault ? 'да' : 'не'}`,
  ];
  return parts.filter(Boolean).join(' | ');
};

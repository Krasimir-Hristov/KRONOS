import 'server-only';
import { getAiModelsConfig } from '@/config/aiModelsConfig';
import {
  extractDocumentWithVisionOcr,
  ocrExtractionResultSchema,
  parseOcrJsonContent,
  type OcrDocumentInput,
  type OcrExtractionResult,
} from '@/lib/ai/documentOcrService';
import { callJsonModel, type LlmTextInvoker } from '@/lib/ai/llmJsonService';
import { redactSecretsFromFreeText } from '@/lib/security/secretFactGuard';
import {
  extractTextDeterministically,
  isTextOrOfficeMimeType,
} from '../utils/deterministicParsers';

const TEXT_CLASSIFIER_SYSTEM_PROMPT = `Ти си експертен документен анализатор за системата KRONOS (DE / BG / EL).
Получаваш детерминистично извлечения текст от файл (.docx, .xlsx, .csv, .html, .txt, .md, .json, .xml).
Върни САМО валиден JSON обект със следната структура:
{
  "title": "Ясно и конкретно заглавие на български (с ключовия немски термин при нужда)",
  "topic": "едно от: kinderzuschlag | wohngeld | kontoauszug | steuer | mietvertrag | zivilstand | arbeit | gesundheit | allgemein",
  "docType": "едно от: bescheid | antrag | kontoauszug | vertrag | urkunde | rechnung | brief | sonstiges",
  "sender": "Институция или подател (или празен низ)",
  "docDate": "Дата от документа във формат YYYY-MM-DD или null",
  "expiresAt": "Краен срок във формат YYYY-MM-DD или null",
  "summaryText": "Кратко и ясно резюме на български (2-4 изречения)",
  "rawOcrText": "",
  "suggestedFacts": [
    {
      "label": "Име на факта (напр. Steuer-ID, IBAN, Kaltmiete)",
      "value": "Точната стойност",
      "category": "personal | tax | bank | family | housing | health | other",
      "hint": "Кратък контекст или null"
    }
  ]
}
ВАЖНО: Никога не извличай пароли, ПИН кодове, PUK или TAN кодове в suggestedFacts и ги маскирай като [СКРИТА ТАЙНА].`;

export interface UniversalIngestionDeps {
  readonly fetchImpl?: typeof fetch;
  readonly invoker?: LlmTextInvoker;
  readonly visionOcr?: typeof extractDocumentWithVisionOcr;
}

const downloadBytesFromSignedUrl = async (
  signedUrl: string,
  fetchImpl: typeof fetch
): Promise<Uint8Array> => {
  const res = await fetchImpl(signedUrl, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) {
    throw new Error(`Неуспешно изтегляне на текстовия файл (HTTP ${res.status}).`);
  }
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
};

const buildDeterministicFallbackResult = (
  fileName: string,
  rawText: string
): OcrExtractionResult => {
  const safeText = redactSecretsFromFreeText(rawText, []);
  const cleanTitle = fileName.replace(/\.[^.]+$/, '').slice(0, 180) || 'Документ';
  return ocrExtractionResultSchema.parse({
    title: cleanTitle,
    topic: 'allgemein',
    docType: 'sonstiges',
    sender: '',
    docDate: null,
    expiresAt: null,
    summaryText: safeText.slice(0, 600),
    rawOcrText: safeText,
    suggestedFacts: [],
  });
};

/**
 * Universal single-pass ingestion ("Очите на KRONOS"):
 * - Uses 0.00 EUR deterministic local parsing for .docx, .xlsx, .csv, .html, .txt, .md, .json, .xml
 *   + fast structured classification via chatFast (DeepSeek) with offline fallback.
 * - Uses single-pass Vision OCR (gemini-3.8-flash) for PDF and all image formats.
 */
export const extractUniversalDocumentContent = async (
  input: OcrDocumentInput,
  deps: UniversalIngestionDeps = {}
): Promise<OcrExtractionResult> => {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;

  if (isTextOrOfficeMimeType(input.mimeType)) {
    const bytes =
      input.bytes ??
      (input.signedUrl
        ? await downloadBytesFromSignedUrl(input.signedUrl, fetchImpl)
        : null);

    if (!bytes) {
      throw new Error('Липсват байтове за детерминистичен парсинг на файла.');
    }

    const extractedText = extractTextDeterministically(
      input.fileName,
      input.mimeType,
      bytes
    );
    const safeRawText = redactSecretsFromFreeText(extractedText, []);

    try {
      const classified = await callJsonModel({
        schema: ocrExtractionResultSchema,
        system: TEXT_CLASSIFIER_SYSTEM_PROMPT,
        user: JSON.stringify({
          fileName: input.fileName,
          mimeType: input.mimeType,
          extractedText: safeRawText.slice(0, 12_000),
        }),
        model: getAiModelsConfig().chatFast,
        temperature: 0.1,
        invoker: deps.invoker,
      });

      const sanitized = parseOcrJsonContent(
        JSON.stringify({
          ...classified,
          rawOcrText: safeRawText,
        })
      );
      return sanitized;
    } catch {
      return buildDeterministicFallbackResult(input.fileName, safeRawText);
    }
  }

  const visionOcr = deps.visionOcr ?? extractDocumentWithVisionOcr;
  return visionOcr(input, fetchImpl);
};

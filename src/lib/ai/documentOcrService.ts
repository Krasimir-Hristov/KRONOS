import 'server-only';
import { z } from 'zod';
import { getAiModelsConfig, OPENROUTER_ENDPOINTS } from '@/config/aiModelsConfig';
import {
  isSuspectedSecretFact,
  redactSecretsFromFreeText,
} from '@/lib/security/secretFactGuard';

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

export const FACT_CATEGORIES = [
  'personal',
  'tax',
  'bank',
  'family',
  'housing',
  'health',
  'other',
] as const;

const isValidOcrIsoDate = (val: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [yStr, mStr, dStr] = val.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() === m - 1 &&
    utc.getUTCDate() === d
  );
};

export const ocrSuggestedFactSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(500),
    category: z.enum(FACT_CATEGORIES).catch('other'),
    hint: z.string().trim().max(240).nullable().optional(),
  })
  .refine((fact) => !isSuspectedSecretFact(fact.label, fact.hint), {
    message: 'Пароли и ПИН кодове не се допускат като обикновени факти.',
  });

export const ocrExtractionResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  topic: z.enum(DOCUMENT_TOPICS).catch('allgemein'),
  docType: z.enum(DOCUMENT_TYPES).catch('sonstiges'),
  sender: z.string().trim().max(160).default(''),
  docDate: z.string().refine(isValidOcrIsoDate).nullable().catch(null),
  expiresAt: z.string().refine(isValidOcrIsoDate).nullable().catch(null),
  summaryText: z.string().trim().max(2500).default(''),
  rawOcrText: z.string().default(''),
  suggestedFacts: z.array(ocrSuggestedFactSchema).max(25).default([]),
});

export type OcrSuggestedFact = z.infer<typeof ocrSuggestedFactSchema>;
export type OcrExtractionResult = z.infer<typeof ocrExtractionResultSchema>;

const openRouterChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1),
        }),
      })
    )
    .min(1),
});

export interface OcrDocumentInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly bytes?: Uint8Array;
  readonly signedUrl?: string;
}

const OCR_SYSTEM_PROMPT = `Ти си експертен OCR и документен анализатор за системата KRONOS (DE / BG / EL).
Анализирай подадения документ (PDF или изображение на немски, български или гръцки) и върни САМО валиден JSON обект със следната структура:
{
  "title": "Ясно и конкретно заглавие на български (с ключовия немски термин при нужда, напр. 'Извлечение Sparkasse — Октомври 2026' или 'Решение за Kinderzuschlag — Familienkasse')",
  "topic": "едно от: kinderzuschlag | wohngeld | kontoauszug | steuer | mietvertrag | zivilstand | arbeit | gesundheit | allgemein",
  "docType": "едно от: bescheid | antrag | kontoauszug | vertrag | urkunde | rechnung | brief | sonstiges",
  "sender": "Институция или подател (напр. Familienkasse, Wohngeldbehörde, Sparkasse, Finanzamt, Vermieter)",
  "docDate": "Дата отпечатана на самия документ във формат YYYY-MM-DD или null",
  "expiresAt": "Краен срок за отговор/валидност във формат YYYY-MM-DD или null",
  "summaryText": "Кратко и ясно резюме на български (2-4 изречения) какво гласи документът и има ли важни суми или срокове",
  "rawOcrText": "Пълен извлечен текст от документа на оригиналния език (DE/BG/EL)",
  "suggestedFacts": [
    {
      "label": "Име на факта (напр. Steuer-ID, IBAN, Kindergeldnummer, Kaltmiete, Aktenzeichen, Versicherungsnummer)",
      "value": "Точната стойност от документа",
      "category": "personal | tax | bank | family | housing | health | other",
      "hint": "Кратък контекст (напр. чие име/банка се отнася) или null"
    }
  ]
}
ВАЖНО: Никога не извличай пароли, ПИН кодове, PUK или TAN кодове в suggestedFacts и ги маскирай като [СКРИТА ТАЙНА] в текста.`;

export const parseOcrJsonContent = (rawContent: string): OcrExtractionResult => {
  const cleaned = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsedJson: unknown = JSON.parse(cleaned);
  const droppedSecrets: string[] = [];

  if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
    const record = parsedJson as Record<string, unknown>;
    if (Array.isArray(record.suggestedFacts)) {
      const safeFacts: unknown[] = [];
      for (const rawFact of record.suggestedFacts) {
        if (rawFact && typeof rawFact === 'object') {
          const factObj = rawFact as Record<string, unknown>;
          const label = typeof factObj.label === 'string' ? factObj.label : '';
          const hint = typeof factObj.hint === 'string' ? factObj.hint : null;
          if (isSuspectedSecretFact(label, hint)) {
            if (typeof factObj.value === 'string' && factObj.value.trim()) {
              droppedSecrets.push(factObj.value.trim());
            }
            continue;
          }
        }
        const checked = ocrSuggestedFactSchema.safeParse(rawFact);
        if (checked.success) {
          safeFacts.push(checked.data);
        }
      }
      record.suggestedFacts = safeFacts;
    }
  }

  const validated = ocrExtractionResultSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('Невалидна структура на OCR отговора от AI модела.');
  }

  return {
    ...validated.data,
    summaryText: redactSecretsFromFreeText(validated.data.summaryText, droppedSecrets),
    rawOcrText: redactSecretsFromFreeText(validated.data.rawOcrText, droppedSecrets),
  };
};

export const extractDocumentWithVisionOcr = async (
  input: OcrDocumentInput,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<OcrExtractionResult> => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Липсва OPENROUTER_API_KEY за OCR обработка.');
    }

    const fileDataUrl = input.bytes
      ? `data:${input.mimeType};base64,${Buffer.from(input.bytes).toString('base64')}`
      : input.signedUrl;

    if (!fileDataUrl) {
      throw new Error('Липсват файлови данни или подписан URL за OCR анализ.');
    }

    const models = getAiModelsConfig();
    const attachmentPart =
      input.mimeType === 'application/pdf'
        ? {
            type: 'file',
            file: {
              filename: input.fileName,
              file_data: fileDataUrl,
            },
          }
        : {
            type: 'image_url',
            image_url: {
              url: fileDataUrl,
            },
          };

    const response = await fetchImpl(`${OPENROUTER_ENDPOINTS.chatBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'KRONOS Document Vault OCR',
      },
      body: JSON.stringify({
        model: models.visionOcr,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: OCR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Анализирай файла "${input.fileName}" и върни структурирания JSON.`,
              },
              attachmentPart,
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter OCR грешка (HTTP ${response.status}).`);
    }

    const rawBody: unknown = await response.json();
    const parsedEnvelope = openRouterChatResponseSchema.safeParse(rawBody);
    if (!parsedEnvelope.success) {
      throw new Error('Неочакван формат на отговора от OpenRouter OCR.');
    }

    const content = parsedEnvelope.data.choices[0]?.message.content;
    if (!content) {
      throw new Error('Празен OCR отговор от AI модела.');
    }

    return parseOcrJsonContent(content);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Неуспешен OCR анализ на документа.';
    throw new Error(msg, { cause: err });
  }
};

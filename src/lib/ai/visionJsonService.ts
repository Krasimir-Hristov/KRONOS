import 'server-only';
import type { z } from 'zod';
import { getAiModelsConfig, OPENROUTER_ENDPOINTS } from '@/config/aiModelsConfig';
import type { OcrDocumentInput } from './documentOcrService';
import { extractJsonObjectText } from './llmJsonService';

const VISION_TIMEOUT_MS = 55_000;

interface ChatEnvelope {
  readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[];
}

const readEnvelopeContent = (body: unknown): string => {
  const envelope = body as ChatEnvelope;
  const content = envelope?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Празен отговор от AI модела.');
  }
  return content;
};

const buildAttachmentPart = (source: OcrDocumentInput, dataUrl: string) =>
  source.mimeType === 'application/pdf'
    ? { type: 'file', file: { filename: source.fileName, file_data: dataUrl } }
    : { type: 'image_url', image_url: { url: dataUrl } };

export interface VisionJsonCallOptions<T> {
  readonly schema: z.ZodType<T>;
  readonly system: string;
  readonly user: string;
  readonly source: OcrDocumentInput;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
}

/** Multimodal (screenshot / PDF) call returning a Zod-validated JSON object. */
export const callVisionJson = async <T>(options: VisionJsonCallOptions<T>): Promise<T> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Липсва OPENROUTER_API_KEY за анализ на файла.');
  }

  const { source } = options;
  const dataUrl = source.bytes
    ? `data:${source.mimeType};base64,${Buffer.from(source.bytes).toString('base64')}`
    : source.signedUrl;
  if (!dataUrl) {
    throw new Error('Липсват данни на прикачения файл.');
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const response = await fetchImpl(`${OPENROUTER_ENDPOINTS.chatBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'KRONOS German Bureaucracy Agent',
    },
    body: JSON.stringify({
      model: options.model ?? getAiModelsConfig().chatPro,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.system },
        {
          role: 'user',
          content: [{ type: 'text', text: options.user }, buildAttachmentPart(source, dataUrl)],
        },
      ],
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter грешка при анализ на файла (HTTP ${response.status}).`);
  }

  const rawBody: unknown = await response.json();
  const parsedJson: unknown = JSON.parse(extractJsonObjectText(readEnvelopeContent(rawBody)));
  const validated = options.schema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('Невалидна структура на отговора от AI модела.');
  }
  return validated.data;
};

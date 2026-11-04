import 'server-only';
import { z } from 'zod';
import {
  EMBEDDING_DIMENSIONS,
  getAiModelsConfig,
  OPENROUTER_ENDPOINTS,
} from '@/config/aiModelsConfig';
import { redactSecretsFromFreeText } from '@/lib/security/secretFactGuard';

const MAX_EMBEDDING_CHAR_LENGTH = 18_000;

const openRouterEmbeddingResponseSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z
          .array(z.number().finite())
          .length(EMBEDDING_DIMENSIONS),
      })
    )
    .min(1),
});

export interface DocumentEmbeddingSource {
  readonly title: string;
  readonly topic: string;
  readonly sender: string;
  readonly docDate: string | null;
  readonly summaryText: string;
  readonly rawOcrText: string;
}

export const buildDocumentEmbeddingInput = (source: DocumentEmbeddingSource): string => {
  const headerLines = [
    `Заглавие: ${source.title.trim()}`,
    `Тема: ${source.topic.trim()}`,
    source.sender.trim() ? `Подател: ${source.sender.trim()}` : '',
    source.docDate ? `Дата на документа: ${source.docDate}` : '',
    source.summaryText.trim() ? `Резюме: ${source.summaryText.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const bodySnippet = redactSecretsFromFreeText(
    source.rawOcrText.trim().slice(0, MAX_EMBEDDING_CHAR_LENGTH)
  );
  const safeHeaders = redactSecretsFromFreeText(headerLines);
  return bodySnippet ? `${safeHeaders}\n\nТекст:\n${bodySnippet}` : safeHeaders;
};

export const serializePgVector = (vector: readonly number[]): string => {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Векторът трябва да бъде точно ${EMBEDDING_DIMENSIONS} измерения.`);
  }
  return `[${vector.join(',')}]`;
};

export const generateTextEmbedding = async (
  inputText: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<string> => {
  try {
    const trimmed = inputText.trim();
    if (!trimmed) {
      throw new Error('Липсва текст за генериране на RAG вектор.');
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Липсва OPENROUTER_API_KEY за генериране на вектори.');
    }

    const models = getAiModelsConfig();
    const response = await fetchImpl(`${OPENROUTER_ENDPOINTS.chatBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'KRONOS RAG Embeddings',
      },
      body: JSON.stringify({
        model: models.embedding,
        input: trimmed.slice(0, MAX_EMBEDDING_CHAR_LENGTH + 2000),
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Embeddings грешка (HTTP ${response.status}).`);
    }

    const rawBody: unknown = await response.json();
    const parsed = openRouterEmbeddingResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new Error('Невалиден векторен отговор от OpenRouter.');
    }

    const vector = parsed.data.data[0]?.embedding;
    if (!vector) {
      throw new Error('Липсва embedding масив в отговора от OpenRouter.');
    }

    return serializePgVector(vector);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Неуспешно генериране на RAG вектор.';
    throw new Error(msg, { cause: err });
  }
};

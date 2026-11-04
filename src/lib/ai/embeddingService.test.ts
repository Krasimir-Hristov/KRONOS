import { describe, expect, it, vi } from 'vitest';
import { EMBEDDING_DIMENSIONS } from '@/config/aiModelsConfig';
import {
  buildDocumentEmbeddingInput,
  generateTextEmbedding,
  serializePgVector,
} from './embeddingService';

describe('embeddingService', () => {
  it('builds structured embedding text from document metadata and OCR snippet', () => {
    const built = buildDocumentEmbeddingInput({
      title: 'Договор за наем',
      topic: 'mietvertrag',
      sender: 'Hausverwaltung GmbH',
      docDate: '2025-05-01',
      summaryText: 'Месечен Kaltmiete 850 EUR.',
      rawOcrText: 'Mietvertrag über Wohnraum...',
    });

    expect(built).toContain('Заглавие: Договор за наем');
    expect(built).toContain('Подател: Hausverwaltung GmbH');
    expect(built).toContain('Mietvertrag über Wohnraum...');
  });

  it('rejects vectors with wrong dimension count', () => {
    expect(() => serializePgVector([0.1, 0.2])).toThrow('1536');
  });

  it('validates 1536-dimensional OpenRouter embedding response', async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key';

    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) =>
      Number((i * 0.0001).toFixed(6))
    );

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: vector }] }), { status: 200 })
    );

    try {
      const serialized = await generateTextEmbedding('Тестов документ Wohngeld', mockFetch);
      expect(serialized.startsWith('[0,0.0001,')).toBe(true);
      expect(serialized.endsWith(']')).toBe(true);
    } finally {
      if (prev === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = prev;
      }
    }
  });
});

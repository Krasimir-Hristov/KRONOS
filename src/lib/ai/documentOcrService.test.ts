import { describe, expect, it, vi } from 'vitest';
import {
  extractDocumentWithVisionOcr,
  parseOcrJsonContent,
} from './documentOcrService';

describe('documentOcrService', () => {
  it('parses fenced JSON OCR output and normalizes unknown enum values safely', () => {
    const raw = `\`\`\`json
    {
      "title": "Решение за Kinderzuschlag",
      "topic": "kinderzuschlag",
      "docType": "bescheid",
      "sender": "Familienkasse Bayern",
      "docDate": "2026-10-12",
      "expiresAt": "invalid-date-value",
      "summaryText": "Одобрено месечно плащане.",
      "rawOcrText": "Bescheid über Kinderzuschlag...",
      "suggestedFacts": [
        {
          "label": "Kindergeldnummer",
          "value": "123FK456789",
          "category": "family",
          "hint": "Основен номер"
        }
      ]
    }
    \`\`\``;

    const result = parseOcrJsonContent(raw);
    expect(result.title).toBe('Решение за Kinderzuschlag');
    expect(result.topic).toBe('kinderzuschlag');
    expect(result.docDate).toBe('2026-10-12');
    expect(result.expiresAt).toBeNull();
    expect(result.suggestedFacts).toHaveLength(1);
    expect(result.suggestedFacts[0]?.label).toBe('Kindergeldnummer');
  });

  it('throws clean Bulgarian error when OPENROUTER_API_KEY is missing', async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    try {
      await expect(
        extractDocumentWithVisionOcr({
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          bytes: new Uint8Array([1, 2, 3]),
        })
      ).rejects.toThrow('OPENROUTER_API_KEY');
    } finally {
      if (prev !== undefined) {
        process.env.OPENROUTER_API_KEY = prev;
      }
    }
  });

  it('sends file payload for PDF and validates OpenRouter response envelope', async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key';

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Банково извлечение Октомври',
                  topic: 'kontoauszug',
                  docType: 'kontoauszug',
                  sender: 'Sparkasse',
                  docDate: '2026-10-31',
                  expiresAt: null,
                  summaryText: 'Месечно извлечение.',
                  rawOcrText: 'Kontoauszug 10/2026 DE89 3704...',
                  suggestedFacts: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    try {
      const res = await extractDocumentWithVisionOcr(
        {
          fileName: 'auszug.pdf',
          mimeType: 'application/pdf',
          bytes: new Uint8Array([37, 80, 68, 70]),
        },
        mockFetch
      );

      expect(res.topic).toBe('kontoauszug');
      expect(res.sender).toBe('Sparkasse');
      expect(mockFetch).toHaveBeenCalledOnce();
    } finally {
      if (prev === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = prev;
      }
    }
  });
});

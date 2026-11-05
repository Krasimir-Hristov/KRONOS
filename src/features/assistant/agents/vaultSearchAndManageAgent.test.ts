import { describe, expect, it, vi } from 'vitest';
import type { CatalogDocumentItem } from '@/features/documents';
import { executeVaultAgent } from './vaultSearchAndManageAgent';

const DOC_A: CatalogDocumentItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Решение за Kinderzuschlag — Октомври 2026',
  topic: 'kinderzuschlag',
  docType: 'bescheid',
  sender: 'Familienkasse',
  docDate: '2026-10-28',
  expiresAt: null,
  storagePath: 'owner/2026/10/kiz.pdf',
  originalFileName: 'kiz.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 2048,
  summaryText: 'Одобрен Kinderzuschlag.',
  processingStatus: 'completed',
  createdAt: '2026-10-29T10:00:00Z',
  updatedAt: '2026-10-29T10:00:00Z',
  reviewMeta: { pendingReview: false, suggestedFacts: [] },
};

const DOC_B: CatalogDocumentItem = {
  ...DOC_A,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Старо писмо от Familienkasse 2025',
  docDate: '2025-05-01',
  createdAt: '2025-05-02T10:00:00Z',
};

describe('vaultSearchAndManageAgent', () => {
  it('returns Zone 1 + Zone 2 documents using Jev reranker', async () => {
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        action: 'search_documents',
        semanticQuery: 'Kinderzuschlag решение',
        searchTerms: ['Kinderzuschlag'],
        topic: 'kinderzuschlag',
      })
    );

    const result = await executeVaultAgent(
      {
        message: 'Намери ми последното решение за Kinderzuschlag',
        intent: 'search_documents',
        tier: 'jev',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        invoker: mockInvoker,
        search: async () => ({ items: [DOC_B, DOC_A], usedVector: true }),
        zones: { rerank: async () => [DOC_A.id] },
      }
    );

    expect(result.zone1DocumentIds).toEqual([DOC_A.id]);
    expect(result.zone2DocumentIds).toEqual([DOC_B.id]);
    expect(result.payload.errorCode).toBeNull();
  });

  it('keeps working with AI_UNAVAILABLE flag when OpenRouter planner fails', async () => {
    const failingInvoker = vi.fn().mockRejectedValue(new Error('OpenRouter offline'));

    const result = await executeVaultAgent(
      {
        message: 'Kinderzuschlag',
        intent: 'search_documents',
        tier: 'offline',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        invoker: failingInvoker,
        search: async () => ({ items: [DOC_A], usedVector: false }),
      }
    );

    expect(result.payload.errorCode).toBe('AI_UNAVAILABLE');
    expect(result.zone1DocumentIds).toEqual([DOC_A.id]);
  });

  it('guards password requests with secrets_gate action without calling AI', async () => {
    const spyInvoker = vi.fn();
    const result = await executeVaultAgent(
      {
        message: 'Запази нова парола за Elster',
        intent: 'manage_secret',
        tier: 'local',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      { invoker: spyInvoker }
    );

    expect(spyInvoker).not.toHaveBeenCalled();
    expect(result.payload.actions[0]?.kind).toBe('secrets_gate');
  });
});

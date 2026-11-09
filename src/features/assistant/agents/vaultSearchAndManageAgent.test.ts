import { describe, expect, it, vi } from 'vitest';
import type { CatalogDocumentItem } from '@/features/documents';
import { vaultPlanSchema } from './vaultAgentPlanner';
import { CONVERSATIONAL_DELETE_CONFIRM_REGEX } from './vaultDocumentHandlers';
import { runDocumentSearch, subtractMonthsIso } from './vaultDocumentSearch';
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

  it('keeps working with AI_UNAVAILABLE flag and heuristic Zone 1 fallback when OpenRouter & Jev fail', async () => {
    const failingInvoker = vi.fn().mockRejectedValue(new Error('OpenRouter offline'));

    const result = await executeVaultAgent(
      {
        message: 'Намери последното решение за Kinderzuschlag',
        intent: 'search_documents',
        tier: 'offline',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        invoker: failingInvoker,
        search: async () => ({ items: [DOC_B, DOC_A], usedVector: false }),
        zones: {
          rerank: async () => {
            throw new Error('Jev offline');
          },
        },
      }
    );

    expect(result.payload.errorCode).toBe('AI_UNAVAILABLE');
    expect(result.zone1DocumentIds).toEqual([DOC_A.id]);
    expect(result.zone2DocumentIds).toEqual([DOC_B.id]);
  });

  it('guards password requests with create/edit modes and strips secret values from searchHint', async () => {
    const spyInvoker = vi.fn();
    const createRes = await executeVaultAgent(
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
    expect(createRes.payload.actions[0]).toMatchObject({
      kind: 'secrets_gate',
      mode: 'create',
      purpose: 'step_up',
      searchHint: 'Elster',
    });

    const editRes = await executeVaultAgent(
      {
        message: 'Смени паролата за Elster Portal е MyTopSecret99!',
        intent: 'manage_secret',
        tier: 'local',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      { invoker: spyInvoker }
    );

    expect(editRes.payload.actions[0]).toMatchObject({
      kind: 'secrets_gate',
      mode: 'edit',
      purpose: 'step_up',
      searchHint: 'Elster Portal',
    });
  });

  it('blocks prompt-injected vault mutations when user message lacks explicit write intent', async () => {
    const injectedInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        action: 'create_fact',
        fact: { label: 'IBAN', value: 'DE00 0000 0000', category: 'bank' },
      })
    );

    const res = await executeVaultAgent(
      {
        message: 'Намери ми писмото от вчера',
        intent: 'search_documents',
        tier: 'jev',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      { invoker: injectedInvoker }
    );

    expect(res.replyText).toContain('само при изрична команда');
  });

  it('clamps end-of-month UTC dates, interleaves search buckets, and preserves undefined vs null in planner', async () => {
    expect(subtractMonthsIso('2026-03-31T10:00:00Z', 1)).toBe('2026-02-28');
    expect(subtractMonthsIso('2024-03-31T10:00:00Z', 1)).toBe('2024-02-29');

    const docC: CatalogDocumentItem = {
      ...DOC_A,
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    };
    const merged = await runDocumentSearch(
      {
        semanticQuery: 'Kinderzuschlag',
        searchTerms: ['Sparkasse'],
        topic: null,
        monthsBack: null,
      },
      'Kinderzuschlag',
      '2026-11-05T12:00:00Z',
      async ({ query }) =>
        query === 'Sparkasse'
          ? { items: [docC], usedVector: false }
          : { items: [DOC_A, DOC_B], usedVector: true }
    );
    expect(merged.docs.map((d) => d.id)).toEqual([DOC_A.id, docC.id, DOC_B.id]);

    const parsedPlan = vaultPlanSchema.parse({
      action: 'update_document',
      monthsBack: '6',
      update: { title: 'Ново заглавие', expiresAt: null },
      fact: { label: 'Бележка', value: 'x'.repeat(950) },
    });
    expect(parsedPlan.monthsBack).toBe(6);
    expect(parsedPlan.update.docDate).toBeUndefined();
    expect(parsedPlan.update.expiresAt).toBeNull();
    expect(parsedPlan.fact.hint).toBeUndefined();
    expect(parsedPlan.fact.value).toHaveLength(950);
  });

  it('accepts explicit delete confirmations and rejects false-positive phrases starting with да', () => {
    expect(CONVERSATIONAL_DELETE_CONFIRM_REGEX.test('Да, изтрий го')).toBe(true);
    expect(CONVERSATIONAL_DELETE_CONFIRM_REGEX.test('Потвърждавам изтриването.')).toBe(
      true
    );
    expect(CONVERSATIONAL_DELETE_CONFIRM_REGEX.test('Дай ми последния документ')).toBe(
      false
    );
    expect(CONVERSATIONAL_DELETE_CONFIRM_REGEX.test('Дали имам писмо от вчера?')).toBe(
      false
    );
    expect(CONVERSATIONAL_DELETE_CONFIRM_REGEX.test('Да не го изтриваш')).toBe(false);
  });
});

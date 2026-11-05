import { describe, expect, it, vi } from 'vitest';
import type { CatalogDocumentItem } from '@/features/documents';
import { selectZone1FromProbabilities } from './jevClient';
import { classifyByKeywords } from './keywordClassifier';
import { routeWithJev } from './jevRouter';
import { splitIntoZones } from './zoneRanking';

const SAMPLE_CRITERIA = {
  vault_search_and_manage: 'Документи и факти в сейфа.',
  german_bureaucracy: 'Онлайн портали Wohngeld/KiZ и писма на немски.',
} as const;

const makeDoc = (
  id: string,
  title: string,
  docDate: string | null,
  createdAt: string
): CatalogDocumentItem => ({
  id,
  title,
  topic: 'kinderzuschlag',
  docType: 'bescheid',
  sender: 'Familienkasse',
  docDate,
  expiresAt: null,
  storagePath: `owner/2026/11/${id}.pdf`,
  originalFileName: `${id}.pdf`,
  mimeType: 'application/pdf',
  fileSizeBytes: 1024,
  summaryText: title,
  processingStatus: 'completed',
  createdAt,
  updatedAt: createdAt,
  reviewMeta: { pendingReview: false, suggestedFacts: [] },
});

describe('jevRouter & two-zone reranking', () => {
  it('routes via Tier 1 Jev Decisions when API succeeds', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            department: { type: 'choice', choice: 'german_bureaucracy' },
            intent: { type: 'choice', choice: 'portal_assist' },
          },
        }),
        { status: 200 }
      )
    );

    const outcome = await routeWithJev(
      {
        message: 'Помогни ми с онлайн портала за Wohngeld',
        attachment: null,
        nowIso: '2026-11-05T20:00:00Z',
        departmentCriteria: SAMPLE_CRITERIA,
      },
      { fetchImpl: fakeFetch }
    );

    expect(outcome.tier).toBe('jev');
    expect(outcome.department).toBe('german_bureaucracy');
    expect(outcome.intent).toBe('portal_assist');
  });

  it('falls back to Tier 2 Traditional Supervisor when Jev fails', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    const failingFetch = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('Jev timeout 1500ms'));
    const backupInvoker = vi
      .fn()
      .mockResolvedValue('{"department":"vault_search_and_manage","intent":"search_documents"}');

    const outcome = await routeWithJev(
      {
        message: 'Намери ми решението за Kinderzuschlag',
        attachment: null,
        nowIso: '2026-11-05T20:00:00Z',
        departmentCriteria: SAMPLE_CRITERIA,
      },
      { fetchImpl: failingFetch, invoker: backupInvoker }
    );

    expect(outcome.tier).toBe('backup');
    expect(outcome.department).toBe('vault_search_and_manage');
    expect(outcome.intent).toBe('search_documents');
  });

  it('degrades to Tier 3 offline classifier when both Jev and OpenRouter fail', async () => {
    const failingFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network down'));
    const failingInvoker = vi.fn().mockRejectedValue(new Error('OpenRouter 503'));

    const outcome = await routeWithJev(
      {
        message: 'Напиши Widerspruch до Familienkasse',
        attachment: null,
        nowIso: '2026-11-05T20:00:00Z',
        departmentCriteria: SAMPLE_CRITERIA,
      },
      { fetchImpl: failingFetch, invoker: failingInvoker }
    );

    expect(outcome.tier).toBe('offline');
    expect(outcome.department).toBe('german_bureaucracy');
    expect(outcome.intent).toBe('draft_reply');
  });

  it('intercepts password/PIN messages locally without calling external APIs', async () => {
    const spyFetch = vi.fn<typeof fetch>();
    const outcome = await routeWithJev(
      {
        message: 'Покажи ми паролата за Elster',
        attachment: null,
        nowIso: '2026-11-05T20:00:00Z',
        departmentCriteria: SAMPLE_CRITERIA,
      },
      { fetchImpl: spyFetch }
    );

    expect(outcome.tier).toBe('local');
    expect(outcome.intent).toBe('manage_secret');
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('splits candidates into Zone 1 (Jev top pick) and Zone 2 (newest-to-oldest)', async () => {
    const d1 = makeDoc(
      '11111111-1111-4111-8111-111111111111',
      'Старо решение 2025',
      '2025-04-10',
      '2025-04-12T10:00:00Z'
    );
    const d2 = makeDoc(
      '22222222-2222-4222-8222-222222222222',
      'Писмо Kinderzuschlag от вчера',
      '2026-11-04',
      '2026-11-04T18:00:00Z'
    );
    const d3 = makeDoc(
      '33333333-3333-4333-8333-333333333333',
      'Решение Септември 2026',
      '2026-09-15',
      '2026-09-16T09:00:00Z'
    );

    const split = await splitIntoZones(
      [d1, d2, d3],
      'дойде ми вчера нещо за Kinderzuschlag',
      '2026-11-05T12:00:00Z',
      {
        rerank: async () => [d2.id],
      }
    );

    expect(split.usedJev).toBe(true);
    expect(split.zone1Ids).toEqual([d2.id]);
    // Zone 2 must be sorted newest-to-oldest (d3 from 2026-09 before d1 from 2025-04)
    expect(split.zone2Ids).toEqual([d3.id, d1.id]);
  });

  it('selectZone1FromProbabilities returns empty when none wins', () => {
    const map = new Map([['doc_1', '11111111-1111-4111-8111-111111111111']]);
    const picked = selectZone1FromProbabilities({ none: 0.85, doc_1: 0.15 }, map);
    expect(picked).toEqual([]);
  });

  it('prioritizes delete requests over portal keywords and unsaved attachments', () => {
    expect(
      classifyByKeywords({
        message: 'Изтрий молбата за Wohngeld от онлайн портала',
        attachment: null,
      })
    ).toEqual({ department: 'vault_search_and_manage', intent: 'delete_document' });

    expect(
      classifyByKeywords({
        message: 'Изтрий IBAN записа ми',
        attachment: null,
      })
    ).toEqual({ department: 'vault_search_and_manage', intent: 'manage_fact' });
  });
});

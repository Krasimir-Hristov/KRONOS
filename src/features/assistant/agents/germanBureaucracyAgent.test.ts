import { describe, expect, it, vi } from 'vitest';
import type { CatalogDocumentItem } from '@/features/documents';
import type { VaultFactItem } from '@/features/vault';
import { executeGermanBureaucracyAgent } from './germanBureaucracyAgent';
import { runKronosSupervisorGraph } from './supervisorGraph';

const SAMPLE_FACTS: readonly VaultFactItem[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    category: 'tax',
    label: 'Steuer-ID',
    valuePlain: '12 345 678 901',
    usernameOrHint: null,
    sourceDocumentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    sourceDocumentTitle: 'Finanzamt Писмо',
    sourceDocumentDate: '2026-03-10',
    updatedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    category: 'bank',
    label: 'IBAN Sparkasse',
    valuePlain: 'DE89 3704 0044 0532 0130 00',
    usernameOrHint: null,
    sourceDocumentId: null,
    sourceDocumentTitle: null,
    sourceDocumentDate: null,
    updatedAt: '2026-04-01T10:00:00Z',
  },
];

const KONTO_OCT: CatalogDocumentItem = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  title: 'Извлечение Sparkasse — Октомври 2026',
  topic: 'kontoauszug',
  docType: 'kontoauszug',
  sender: 'Sparkasse',
  docDate: '2026-10-31',
  expiresAt: null,
  storagePath: 'owner/2026/10/oct.pdf',
  originalFileName: 'oct.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 4096,
  summaryText: 'Месечно извлечение.',
  processingStatus: 'completed',
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-01T08:00:00Z',
  reviewMeta: { pendingReview: false, suggestedFacts: [] },
};

describe('germanBureaucracyAgent & supervisorGraph', () => {
  it('extracts portal guide, matches Steuer-ID/IBAN cards, and prepares separate portal files', async () => {
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        replyBg: 'За Wohngeld са нужни банкови извлечения и вашите данни.',
        guide: {
          explanationBg: 'Прикачете извлеченията като отделни файлове.',
          deadline: '2026-11-30',
          steps: ['Попълнете Steuer-ID и IBAN', 'Качете извлеченията'],
          neededDocuments: [
            { description: 'Kontoauszüge', topic: 'kontoauszug', monthsBack: 6 },
          ],
          neededFactLabels: ['Steuer-ID', 'IBAN'],
        },
        draft: null,
      })
    );

    const result = await executeGermanBureaucracyAgent(
      {
        message: 'Трябват ми документи и данни за онлайн портала за Wohngeld',
        intent: 'portal_assist',
        tier: 'jev',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        invoker: mockInvoker,
        loadFacts: async () => SAMPLE_FACTS,
        search: async () => ({ items: [KONTO_OCT], usedVector: true }),
      }
    );

    expect(result.payload.facts).toHaveLength(2);
    expect(result.payload.facts[0]?.sourceDocumentId).toBe(
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    );
    expect(result.payload.facts[1]?.sourceDocumentId).toBeNull();
    expect(result.payload.portalDocumentIds).toEqual([KONTO_OCT.id]);
    expect(result.replyText).toContain('1 от 6');
  });

  it('generates official German Widerspruch draft with Bulgarian explanation', async () => {
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        replyBg: 'Подготвих официално възражение (Widerspruch).',
        guide: null,
        draft: {
          subjectLine: 'Widerspruch gegen den Bescheid vom 20.10.2026',
          germanText: 'Sehr geehrte Damen und Herren, hiermit lege ich fristgerecht Widerspruch ein.',
          bulgarianExplanation: 'Официално възражение в едномесечния срок.',
        },
      })
    );

    const result = await executeGermanBureaucracyAgent(
      {
        message: 'Напиши Widerspruch до Familienkasse',
        intent: 'draft_reply',
        tier: 'jev',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        invoker: mockInvoker,
        loadFacts: async () => SAMPLE_FACTS,
      }
    );

    expect(result.payload.draft?.subjectLine).toContain('Widerspruch');
    expect(result.payload.draft?.germanText).toContain('Sehr geehrte Damen und Herren');
  });

  it('executes full LangGraph supervisor routing end-to-end', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    const fakeJevFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            department: { type: 'choice', choice: 'german_bureaucracy' },
            intent: { type: 'choice', choice: 'draft_reply' },
          },
        }),
        { status: 200 }
      )
    );

    const customSubagent = {
      agentId: 'mockGermanAgent',
      department: 'german_bureaucracy' as const,
      jevCriteria: 'German portal & letters',
      inputSchema: (await import('../schemas/assistantSchema')).agentExecutionInputSchema,
      outputSchema: (await import('../schemas/assistantSchema')).assistantTurnResultSchema,
      execute: async () => ({
        replyText: 'Готов отговор от LangGraph.',
        payload: {
          department: 'german_bureaucracy' as const,
          intent: 'draft_reply' as const,
          tier: 'jev' as const,
          errorCode: null,
          facts: [],
          guide: null,
          draft: null,
          actions: [],
          portalDocumentIds: [],
        },
        zone1DocumentIds: [],
        zone2DocumentIds: [],
      }),
    };

    const res = await runKronosSupervisorGraph(
      {
        message: 'Напиши Widerspruch',
        attachment: null,
        history: [],
        nowIso: '2026-11-05T12:00:00Z',
      },
      {
        fetchImpl: fakeJevFetch,
        registry: {
          vault_search_and_manage: customSubagent,
          german_bureaucracy: customSubagent,
        },
      }
    );

    expect(res.replyText).toBe('Готов отговор от LangGraph.');
    expect(res.payload.tier).toBe('jev');
  });
});

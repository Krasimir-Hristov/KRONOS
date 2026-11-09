import { describe, expect, it, vi } from 'vitest';
import { executeGeneralChatAgent } from './generalChatAgent';
import { runKronosSupervisorGraph } from './supervisorGraph';

describe('generalChatAgent & Hierarchical Supervisor Architecture', () => {
  it('answers everyday questions and understands pre-ingested images via Supervisor', async () => {
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        replyBg: 'На снимката се вижда двигател 2.0 TDI, който изисква масло 5W-30.',
        topicSummary: 'Двигател и моторно масло',
      })
    );

    const res = await executeGeneralChatAgent(
      {
        message: 'Какво масло взима този двигател от снимката?',
        intent: 'general_chat',
        tier: 'jev',
        attachment: {
          storagePath: 'owner/2026/11/abc-engine.jpg',
          fileName: 'engine.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 2048,
          saveToVault: false,
        },
        ingestedAttachment: {
          fileName: 'engine.jpg',
          mimeType: 'image/jpeg',
          title: 'Снимка на двигател VW 2.0 TDI',
          topic: 'allgemein',
          docType: 'sonstiges',
          sender: '',
          docDate: null,
          expiresAt: null,
          summaryText: 'Етикет под капака: VW 507 00 / 5W-30 LongLife.',
          rawOcrText: 'VW 507 00 5W-30',
          suggestedFacts: [],
        },
        previousAgentState: { lastTopic: 'Автомобили' },
        history: [],
        nowIso: '2026-11-09T12:00:00Z',
      },
      { invoker: mockInvoker }
    );

    expect(res.payload.department).toBe('general_chat');
    expect(res.replyText).toContain('5W-30');
    expect(res.payload.agentStateSnapshot).toEqual({
      lastTopic: 'Двигател и моторно масло',
      hadAttachment: true,
      savedDocumentId: null,
    });
  });

  it('saves attached file to RAG system when requested in everyday chat', async () => {
    const mockSave = vi.fn().mockResolvedValue({
      documentId: '99999999-9999-4999-8999-999999999999',
      title: 'Бележка за гаранция',
      aiError: null,
      alreadyExisted: false,
    });
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        replyBg: 'Разгледах снимката и я запазих в RAG сейфа.',
        topicSummary: 'Запазване на гаранция',
      })
    );

    const res = await executeGeneralChatAgent(
      {
        message: 'Обясни ми тази снимка и я запази в сейфа',
        intent: 'general_chat',
        tier: 'jev',
        attachment: {
          storagePath: 'owner/2026/11/abc-warranty.png',
          fileName: 'warranty.png',
          mimeType: 'image/png',
          fileSizeBytes: 1024,
          saveToVault: false,
        },
        history: [],
        nowIso: '2026-11-09T12:00:00Z',
      },
      { invoker: mockInvoker, saveAttachment: mockSave }
    );

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.payload.actions).toHaveLength(1);
    expect(res.payload.actions[0]).toMatchObject({
      kind: 'notice',
      tone: 'success',
      documentId: '99999999-9999-4999-8999-999999999999',
    });
  });

  it('runs single-pass Pre-Jev Ingestion in Supervisor and slices previousAgentState per subagent', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';

    const buildVisionSourceSpy = vi.fn().mockResolvedValue({
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      bytes: new Uint8Array([1, 2, 3]),
    });
    const extractOcrSpy = vi.fn().mockResolvedValue({
      title: 'Снимка на касова бележка',
      topic: 'allgemein',
      docType: 'rechnung',
      sender: 'Lidl',
      docDate: '2026-11-09',
      expiresAt: null,
      summaryText: 'Покупка на хранителни продукти за 42.50 EUR.',
      rawOcrText: 'Lidl Summe 42.50 EUR',
      suggestedFacts: [],
    });

    const fakeJevFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            department: { type: 'choice', choice: 'general_chat' },
            intent: { type: 'choice', choice: 'general_chat' },
          },
        }),
        { status: 200 }
      )
    );

    const { agentExecutionInputSchema, assistantTurnResultSchema } = await import(
      '../schemas/assistantSchema'
    );

    const generalExecuteSpy = vi.fn().mockImplementation(async (input) => ({
      replyText: `Виждам: ${input.ingestedAttachment?.title} (предходна тема: ${String(input.previousAgentState?.lastTopic)})`,
      payload: {
        department: 'general_chat' as const,
        intent: 'general_chat' as const,
        tier: 'jev' as const,
        errorCode: null,
        facts: [],
        guide: null,
        draft: null,
        actions: [],
        portalDocumentIds: [],
        agentStateSnapshot: { lastTopic: 'Покупки Lidl 42.50 EUR' },
      },
      zone1DocumentIds: [],
      zone2DocumentIds: [],
    }));

    const turnResult = await runKronosSupervisorGraph(
      {
        message: 'Какво има на тази снимка?',
        attachment: {
          storagePath: 'owner/2026/11/abc-photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1024,
          saveToVault: false,
        },
        agentStatesByDepartment: {
          general_chat: { lastTopic: 'Предишен разговор за бюджет' },
          german_bureaucracy: { lastIntent: 'draft_reply' },
        },
        history: [],
        nowIso: '2026-11-09T12:00:00Z',
      },
      {
        fetchImpl: fakeJevFetch,
        buildVisionSource: buildVisionSourceSpy,
        extractOcr: extractOcrSpy,
        registry: {
          general_chat: {
            agentId: 'mockGeneralChatAgent',
            department: 'general_chat',
            jevCriteria: 'Everyday chat',
            inputSchema: agentExecutionInputSchema,
            outputSchema: assistantTurnResultSchema,
            execute: generalExecuteSpy,
          },
        },
      }
    );

    // 1. Pre-Jev Ingestion ran ONCE in the Supervisor before Jev routing
    expect(buildVisionSourceSpy).toHaveBeenCalledTimes(1);
    expect(extractOcrSpy).toHaveBeenCalledTimes(1);

    // 2. Jev received the attachmentDigest in its state payload
    const jevRequestBody = JSON.parse(
      String(fakeJevFetch.mock.calls[0]?.[1]?.body ?? '{}')
    ) as { state?: { attachmentDigest?: string } };
    expect(jevRequestBody.state?.attachmentDigest).toContain('Снимка на касова бележка');

    // 3. Subagent received both ingestedAttachment AND its own sliced previousAgentState
    expect(generalExecuteSpy).toHaveBeenCalledTimes(1);
    expect(turnResult.replyText).toBe(
      'Виждам: Снимка на касова бележка (предходна тема: Предишен разговор за бюджет)'
    );
    expect(turnResult.payload.agentStateSnapshot).toEqual({
      lastTopic: 'Покупки Lidl 42.50 EUR',
    });
  });
});

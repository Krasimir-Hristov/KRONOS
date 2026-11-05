import { describe, expect, it } from 'vitest';
import {
  assistantTurnPayloadSchema,
  emptyTurnPayload,
  sendChatMessageInputSchema,
} from './assistantSchema';
import { jevDecisionResponseSchema } from './jevSchema';

describe('assistantSchema', () => {
  it('rejects empty message when no attachment is provided', () => {
    const res = sendChatMessageInputSchema.safeParse({
      message: '   ',
      attachment: null,
    });
    expect(res.success).toBe(false);
  });

  it('accepts attachment-only screenshot message up to 50 MB', () => {
    const res = sendChatMessageInputSchema.safeParse({
      message: '',
      attachment: {
        storagePath: '11111111-1111-1111-1111-111111111111/2026/11/screen.png',
        fileName: 'Portal_Screenshot.png',
        mimeType: 'image/png',
        fileSizeBytes: 512_000,
        saveToVault: false,
      },
    });
    expect(res.success).toBe(true);
  });

  it('produces valid default payload via emptyTurnPayload', () => {
    const payload = emptyTurnPayload();
    const checked = assistantTurnPayloadSchema.safeParse(payload);
    expect(checked.success).toBe(true);
    expect(payload.tier).toBe('offline');
    expect(payload.facts).toEqual([]);
  });

  it('parses OpenRouter Jev Decisions choice and noul answers', () => {
    const raw = {
      answers: {
        department: {
          type: 'choice',
          choice: 'german_bureaucracy',
          probabilities: {
            german_bureaucracy: 0.94,
            vault_search_and_manage: 0.06,
          },
          confidence: 0.89,
        },
        urgent: {
          type: 'noul',
          noul: 0.82,
        },
      },
    };
    const parsed = jevDecisionResponseSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});

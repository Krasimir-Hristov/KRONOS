import { describe, expect, it } from 'vitest';
import {
  approveDocumentItemSchema,
  buildPortalFileName,
  classicDocumentSearchSchema,
  documentReviewMetaSchema,
} from './documentSchema';

describe('documentSchema', () => {
  it('generates clean portal-ready file names with date and extension', () => {
    const fileName = buildPortalFileName({
      docDate: '2026-10-31',
      createdAt: '2026-11-04T18:00:00Z',
      topic: 'kontoauszug',
      title: 'Kontoauszug Sparkasse Октомври 2026!',
      mimeType: 'application/pdf',
      originalFileName: 'scan001.pdf',
    });

    expect(fileName).toBe('2026-10-31_Kontoauszug_Sparkasse_Октомври_2026.pdf');
  });

  it('parses review metadata safely even on empty json object', () => {
    const meta = documentReviewMetaSchema.parse({});
    expect(meta.pendingReview).toBe(false);
    expect(meta.suggestedFacts).toEqual([]);
  });

  it('transforms empty string dates to null on approval', () => {
    const parsed = approveDocumentItemSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Решение за Wohngeld',
      topic: 'wohngeld',
      docType: 'bescheid',
      sender: 'Stadt München',
      docDate: '2026-09-15',
      expiresAt: '',
      selectedFacts: [],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expiresAt).toBeNull();
    }
  });

  it('validates classic search defaults cleanly', () => {
    const parsed = classicDocumentSearchSchema.parse({});
    expect(parsed.sortBy).toBe('doc_date_desc');
    expect(parsed.query).toBe('');
  });
});

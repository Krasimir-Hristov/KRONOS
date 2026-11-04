import { describe, expect, it } from 'vitest';
import {
  approveDocumentItemSchema,
  buildPortalFileName,
  classicDocumentSearchSchema,
  documentReviewMetaSchema,
  suggestedFactItemSchema,
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

  it('parses review metadata safely and strips secret facts', () => {
    const meta = documentReviewMetaSchema.parse({
      pendingReview: true,
      suggestedFacts: [
        { label: 'IBAN', value: 'DE89370400440532013000', category: 'bank' },
        { label: 'Online-PIN', value: '1234', category: 'bank' },
      ],
    });
    expect(meta.pendingReview).toBe(true);
    expect(meta.suggestedFacts).toHaveLength(1);
    expect(meta.suggestedFacts[0]?.label).toBe('IBAN');

    expect(
      suggestedFactItemSchema.safeParse({
        label: 'Passwort',
        value: 'Secret!1',
        category: 'other',
      }).success
    ).toBe(false);
  });

  it('transforms empty string dates to null and rejects impossible calendar dates', () => {
    const validLeap = approveDocumentItemSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Решение за Wohngeld',
      topic: 'wohngeld',
      docType: 'bescheid',
      sender: 'Stadt München',
      docDate: '2024-02-29',
      expiresAt: '',
      selectedFacts: [],
    });

    expect(validLeap.success).toBe(true);
    if (validLeap.success) {
      expect(validLeap.data.expiresAt).toBeNull();
      expect(validLeap.data.docDate).toBe('2024-02-29');
    }

    const invalidCalendar = approveDocumentItemSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Решение за Wohngeld',
      topic: 'wohngeld',
      docType: 'bescheid',
      sender: 'Stadt München',
      docDate: '2026-02-30',
      expiresAt: '',
      selectedFacts: [],
    });

    expect(invalidCalendar.success).toBe(false);
  });

  it('validates classic search defaults and pagination cleanly', () => {
    const parsed = classicDocumentSearchSchema.parse({});
    expect(parsed.sortBy).toBe('doc_date_desc');
    expect(parsed.query).toBe('');
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });
});

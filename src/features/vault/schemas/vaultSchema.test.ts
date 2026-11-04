import { describe, expect, it } from 'vitest';
import {
  areFactsDuplicate,
  vaultFactInputSchema,
  vaultSecretInputSchema,
} from './vaultSchema';

describe('vaultSchema & smart fact deduplication', () => {
  it('detects duplicate IBAN even when spaces and label wording differ', () => {
    const existing = {
      label: 'IBAN Sparkasse',
      value: 'DE89 3704 0044 0532 0130 00',
    };
    const candidate = {
      label: 'Банкова сметка (IBAN)',
      value: 'de89370400440532013000',
    };

    expect(areFactsDuplicate(existing, candidate)).toBe(true);
  });

  it('detects duplicate Steuer-ID across different formatting styles', () => {
    const existing = {
      label: 'Steuer-ID',
      value: '12 345 678 901',
    };
    const candidate = {
      label: 'Данъчен номер (Steuer-ID)',
      value: '12345678901',
    };

    expect(areFactsDuplicate(existing, candidate)).toBe(true);
  });

  it('does NOT mark two different family Steuer-IDs as duplicates', () => {
    const parent = { label: 'Steuer-ID', value: '12 345 678 901' };
    const child = { label: 'Steuer-ID (Дете)', value: '98 765 432 109' };

    expect(areFactsDuplicate(parent, child)).toBe(false);
  });

  it('does NOT mark changed Kaltmiete amount as duplicate', () => {
    const oldRent = { label: 'Kaltmiete', value: '850 EUR' };
    const newRent = { label: 'Kaltmiete', value: '910 EUR' };

    expect(areFactsDuplicate(oldRent, newRent)).toBe(false);
  });

  it('validates plain fact and secret inputs strictly', () => {
    expect(
      vaultFactInputSchema.safeParse({
        category: 'tax',
        label: 'Steuer-ID',
        value: '12345678901',
      }).success
    ).toBe(true);

    expect(
      vaultSecretInputSchema.safeParse({
        category: 'personal',
        label: 'ELSTER Портал',
        secretValue: '',
      }).success
    ).toBe(false);
  });
});

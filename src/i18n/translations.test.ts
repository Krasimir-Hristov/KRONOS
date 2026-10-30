import { describe, expect, it } from 'vitest';
import { getDictionary, parseLocale } from '@/i18n/translations';

describe('Bilingual BG/EL translations & Graceful Degradation messages', () => {
  it('parses valid locales and defaults to bg on unknown input', () => {
    expect(parseLocale('bg')).toBe('bg');
    expect(parseLocale('el')).toBe('el');
    expect(parseLocale('de')).toBe('bg');
    expect(parseLocale(undefined)).toBe('bg');
  });

  it('provides non-empty Graceful Degradation messages in both Bulgarian and Greek', () => {
    const bg = getDictionary('bg');
    const el = getDictionary('el');

    expect(bg.degradation.aiUnavailableTitle.length).toBeGreaterThan(5);
    expect(el.degradation.aiUnavailableTitle.length).toBeGreaterThan(5);
    expect(bg.degradation.aiUnavailableBody).toContain('100%');
    expect(el.degradation.aiUnavailableBody).toContain('100%');
  });
});

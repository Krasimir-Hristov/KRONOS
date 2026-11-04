import { describe, expect, it } from 'vitest';
import {
  isSuspectedSecretFact,
  redactSecretsFromFreeText,
} from './secretFactGuard';

describe('secretFactGuard', () => {
  it('flags passwords, PINs, PUKs, and TANs across DE, BG, EN, and EL', () => {
    expect(isSuspectedSecretFact('Online-PIN')).toBe(true);
    expect(isSuspectedSecretFact('Passwort ELSTER')).toBe(true);
    expect(isSuspectedSecretFact('Временна парола')).toBe(true);
    expect(isSuspectedSecretFact('ПИН код за карта')).toBe(true);
    expect(isSuspectedSecretFact('Telefon-PIN2')).toBe(true);
    expect(isSuspectedSecretFact('pushTAN код')).toBe(true);
    expect(isSuspectedSecretFact('Към портал', 'Временен PIN')).toBe(true);
  });

  it('allows normal bureaucratic facts and cities containing pin substring', () => {
    expect(isSuspectedSecretFact('Steuer-ID')).toBe(false);
    expect(isSuspectedSecretFact('IBAN Sparkasse')).toBe(false);
    expect(isSuspectedSecretFact('Kindergeldnummer')).toBe(false);
    expect(isSuspectedSecretFact('Finanzamt Pinneberg')).toBe(false);
    expect(isSuspectedSecretFact('Kaltmiete')).toBe(false);
  });

  it('redacts inline PIN/password values and explicitly dropped secret values', () => {
    const raw = 'Вашият нов Online-PIN: 8492 и Passwort=Geheim!99 за вход.';
    const cleaned = redactSecretsFromFreeText(raw, ['ExtraSecret123']);
    expect(cleaned).not.toContain('8492');
    expect(cleaned).not.toContain('Geheim!99');
    expect(cleaned).toContain('[СКРИТА ТАЙНА]');

    const cleanedExplicit = redactSecretsFromFreeText(
      'Код за активиране ExtraSecret123 в писмото.',
      ['ExtraSecret123']
    );
    expect(cleanedExplicit).not.toContain('ExtraSecret123');
  });
});

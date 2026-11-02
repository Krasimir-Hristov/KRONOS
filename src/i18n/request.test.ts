import { describe, expect, it } from 'vitest';
import bgMessages from '../../messages/bg.json';

describe('i18n configuration and dictionary', () => {
  it('loads valid Bulgarian translations for core sections', () => {
    expect(bgMessages.app.title).toBe('KRONOS');
    expect(bgMessages.app.pinProtected).toBeDefined();
    expect(bgMessages.nav.documents).toBe('Документен Сейф');
    expect(bgMessages.nav.vault).toBe('Данни & Пароли');
    expect(bgMessages.documents.dropzoneText).toBeDefined();
    expect(bgMessages.auth.pinTitle).toBeDefined();
    expect(bgMessages.vault.passwordsTab).toBeDefined();
  });
});

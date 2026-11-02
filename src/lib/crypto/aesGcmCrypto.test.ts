import { describe, expect, it } from 'vitest';
import { decryptAesGcm, encryptAesGcm } from '@/lib/crypto/aesGcmCrypto';

describe('aesGcmCrypto', () => {
  const testSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const alternativeSecret = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  it('encrypts and decrypts text cleanly with correct key', () => {
    const raw = 'MeinGeheimesPasswort123!@#';
    const encrypted = encryptAesGcm(raw, testSecret);

    expect(encrypted.startsWith('v1:')).toBe(true);
    const decrypted = decryptAesGcm(encrypted, testSecret);
    expect(decrypted).toBe(raw);
  });

  it('fails decryption gracefully when wrong key is provided', () => {
    const raw = 'SuperSecretTaxId_DE123456789';
    const encrypted = encryptAesGcm(raw, testSecret);
    const decrypted = decryptAesGcm(encrypted, alternativeSecret);
    expect(decrypted).toBeNull();
  });

  it('encrypts and decrypts empty string correctly', () => {
    const raw = '';
    const encrypted = encryptAesGcm(raw, testSecret);
    const decrypted = decryptAesGcm(encrypted, testSecret);
    expect(decrypted).toBe('');
  });
});

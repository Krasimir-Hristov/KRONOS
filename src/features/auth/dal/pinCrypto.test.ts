import { describe, expect, it } from 'vitest';
import {
  createEncryptedPinCookie,
  hashPin,
  verifyEncryptedPinCookie,
  verifyPinHash,
} from '@/features/auth/dal/pinCrypto';

describe('pinCrypto', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const userId = '11111111-2222-3333-4444-555555555555';

  it('hashes 4-digit PIN and verifies matching PIN', () => {
    const pin = '1984';
    const hash = hashPin(pin);

    expect(hash.includes(':')).toBe(true);
    expect(verifyPinHash('1984', hash)).toBe(true);
    expect(verifyPinHash('0000', hash)).toBe(false);
    expect(verifyPinHash('1985', hash)).toBe(false);
  });

  it('encrypts and verifies PIN cookie with user ID and active TTL', () => {
    const cookie = createEncryptedPinCookie(userId, 15, secretKey);
    expect(verifyEncryptedPinCookie(cookie, userId, secretKey)).toBe(true);
  });

  it('rejects PIN cookie if user ID does not match', () => {
    const cookie = createEncryptedPinCookie(userId, 15, secretKey);
    const otherUser = '99999999-8888-7777-6666-555555555555';
    expect(verifyEncryptedPinCookie(cookie, otherUser, secretKey)).toBe(false);
  });

  it('rejects expired PIN cookie', () => {
    // Negative TTL creates an already expired cookie
    const expiredCookie = createEncryptedPinCookie(userId, -1, secretKey);
    expect(verifyEncryptedPinCookie(expiredCookie, userId, secretKey)).toBe(false);
  });
});

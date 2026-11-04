import crypto from 'node:crypto';
import { decryptAesGcm, encryptAesGcm } from '@/lib/crypto/aesGcmCrypto';

const SCRYPT_KEY_LENGTH = 32;

export interface PinCookiePayload {
  readonly uid: string;
  readonly exp: number;
  readonly nonce: string;
}

export const hashPin = (pin: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(pin, salt, SCRYPT_KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPinHash = (pin: string, storedHash: string): boolean => {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, expectedHashHex] = parts;
    if (!salt || !expectedHashHex) return false;

    const expectedKey = Buffer.from(expectedHashHex, 'hex');
    const actualKey = crypto.scryptSync(pin, salt, SCRYPT_KEY_LENGTH);

    if (expectedKey.length !== actualKey.length) return false;
    return crypto.timingSafeEqual(expectedKey, actualKey);
  } catch {
    return false;
  }
};

export const createEncryptedPinCookie = (
  userId: string,
  ttlMinutes: number,
  secretKey: string
): string => {
  const expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;
  const payload: PinCookiePayload = {
    uid: userId,
    exp: expiresAtMs,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  return encryptAesGcm(JSON.stringify(payload), secretKey);
};

export const getVerifiedPinCookieExpiry = (
  cookieValue: string | undefined,
  expectedUserId: string,
  secretKey: string
): number | null => {
  if (!cookieValue) return null;
  try {
    const decrypted = decryptAesGcm(cookieValue, secretKey);
    if (!decrypted) return null;

    const parsed = JSON.parse(decrypted) as PinCookiePayload;
    if (parsed.uid !== expectedUserId) return null;
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null;

    return parsed.exp;
  } catch {
    return null;
  }
};

export const verifyEncryptedPinCookie = (
  cookieValue: string | undefined,
  expectedUserId: string,
  secretKey: string
): boolean => {
  return getVerifiedPinCookieExpiry(cookieValue, expectedUserId, secretKey) !== null;
};

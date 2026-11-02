import 'server-only';
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const CIPHER_PREFIX = 'v1';

const deriveKey = (secret: string): Buffer => {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
};

export const encryptAesGcm = (plainText: string, secretKey: string): string => {
  try {
    const key = deriveKey(secretKey);
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${CIPHER_PREFIX}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch {
    throw new Error('Грешка при криптиране на данните.');
  }
};

export const decryptAesGcm = (
  payload: string,
  secretKey: string
): string | null => {
  try {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== CIPHER_PREFIX) {
      return null;
    }

    const ivHex = parts[1];
    const tagHex = parts[2];
    const cipherHex = parts[3];

    if (!ivHex || !tagHex || cipherHex === undefined) {
      return null;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    if (
      iv.length !== IV_LENGTH_BYTES ||
      authTag.length !== AUTH_TAG_LENGTH_BYTES
    ) {
      return null;
    }

    const key = deriveKey(secretKey);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return null;
  }
};

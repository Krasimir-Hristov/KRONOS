import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 52_428_800 as const; // 50 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const storageUploadRequestSchema = z.object({
  fileName: z.string().trim().min(1, 'Името на файла е задължително.'),
  fileSizeBytes: z
    .number()
    .positive('Размерът на файла трябва да е по-голям от 0 байта.')
    .max(MAX_FILE_SIZE_BYTES, 'Файлът надвишава максималния лимит от 50 MB.'),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: 'Неподдържан файлов формат. Разрешени са само PDF, JPEG, PNG и WebP.',
  }),
});

export type StorageUploadRequestInput = z.infer<typeof storageUploadRequestSchema>;

export const sanitizeFileNameSlug = (name: string): string => {
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() ?? 'bin' : 'bin';
  const base = parts.join('.');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9а-яёα-ω0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  return `${slug || 'doc'}.${ext}`;
};

export const buildVaultStoragePath = (
  ownerId: string,
  originalFileName: string,
  now: Date = new Date()
): string => {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const fileUuid = globalThis.crypto.randomUUID();
  const safeSlug = sanitizeFileNameSlug(originalFileName);
  return `${ownerId}/${year}/${month}/${fileUuid}-${safeSlug}`;
};

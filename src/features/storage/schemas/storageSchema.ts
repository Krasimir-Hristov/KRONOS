import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 52_428_800 as const; // 50 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/heic',
  'image/heif',
  'text/html',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const FILE_INPUT_ACCEPT_STRING =
  'application/pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,.jfif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif,.pdf,.html,.htm,.docx,.xlsx,.csv,.txt,.md,.json,.xml';

const EXTENSION_TO_MIME: Readonly<Record<string, AllowedMimeType>> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const resolveCanonicalMimeType = (
  fileName: string,
  rawMimeType: string
): AllowedMimeType | null => {
  const normalizedRaw = rawMimeType.trim().toLowerCase().split(';')[0]?.trim() ?? '';
  if (normalizedRaw === 'image/pjpeg' || normalizedRaw === 'image/jfif') {
    return 'image/jpeg';
  }
  const ext = fileName.split('.').pop()?.trim().toLowerCase() ?? '';
  if (ext === 'jfif') {
    return 'image/jpeg';
  }
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(normalizedRaw)) {
    return normalizedRaw as AllowedMimeType;
  }
  return EXTENSION_TO_MIME[ext] ?? null;
};

export const storageUploadRequestSchema = z.object({
  fileName: z.string().trim().min(1, 'Името на файла е задължително.'),
  fileSizeBytes: z
    .number()
    .positive('Размерът на файла трябва да е по-голям от 0 байта.')
    .max(MAX_FILE_SIZE_BYTES, 'Файлът надвишава максималния лимит от 50 MB.'),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message:
      'Неподдържан файлов формат. Разрешени са PDF, снимки (.jpg, .png, .webp, .jfif, .heic), уеб (.html), офис (.docx, .xlsx, .csv) и текстови файлове (.txt, .md, .json, .xml).',
  }),
});

export type StorageUploadRequestInput = z.infer<typeof storageUploadRequestSchema>;

export const sanitizeFileNameSlug = (name: string): string => {
  const parts = name.split('.');
  const rawExt = parts.length > 1 ? parts.pop()?.toLowerCase() ?? 'bin' : 'bin';
  const ext = rawExt === 'jfif' ? 'jpg' : rawExt;
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

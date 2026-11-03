import { describe, expect, it } from 'vitest';
import {
  buildVaultStoragePath,
  MAX_FILE_SIZE_BYTES,
  storageUploadRequestSchema,
} from '@/features/storage/schemas/storageSchema';

describe('storageSchema', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  it('validates 50 MB upper cap and allowed mime types', () => {
    const valid = storageUploadRequestSchema.safeParse({
      fileName: 'Kontoauszug_Januar.pdf',
      fileSizeBytes: 1024 * 1024 * 10, // 10 MB
      mimeType: 'application/pdf',
    });
    expect(valid.success).toBe(true);

    const tooBig = storageUploadRequestSchema.safeParse({
      fileName: 'HugeArchive.pdf',
      fileSizeBytes: MAX_FILE_SIZE_BYTES + 1,
      mimeType: 'application/pdf',
    });
    expect(tooBig.success).toBe(false);

    const unsupportedMime = storageUploadRequestSchema.safeParse({
      fileName: 'script.exe',
      fileSizeBytes: 1024,
      mimeType: 'application/x-msdownload',
    });
    expect(unsupportedMime.success).toBe(false);
  });

  it('constructs structured vault storage path scoped to owner id', () => {
    const fixedDate = new Date('2026-11-02T12:00:00Z');
    const path = buildVaultStoragePath(userId, 'Kindergeld Bescheid 2026.pdf', fixedDate);

    expect(path.startsWith(`${userId}/2026/11/`)).toBe(true);
    expect(path.endsWith('.pdf')).toBe(true);
  });
});

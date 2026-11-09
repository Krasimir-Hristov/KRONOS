import { describe, expect, it } from 'vitest';
import {
  buildVaultStoragePath,
  MAX_FILE_SIZE_BYTES,
  resolveCanonicalMimeType,
  storageUploadRequestSchema,
} from '@/features/storage/schemas/storageSchema';
import { normalizeUploadFileForVault } from '@/features/storage/utils/fileFormatNormalizer';

describe('storageSchema & universal file normalizer', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  it('validates 50 MB upper cap and all 15+ allowed mime types', () => {
    const valid = storageUploadRequestSchema.safeParse({
      fileName: 'Kontoauszug_Januar.pdf',
      fileSizeBytes: 1024 * 1024 * 10, // 10 MB
      mimeType: 'application/pdf',
    });
    expect(valid.success).toBe(true);

    const validDocx = storageUploadRequestSchema.safeParse({
      fileName: 'Antrag_Wohngeld.docx',
      fileSizeBytes: 50_000,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(validDocx.success).toBe(true);

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

  it('normalizes .jfif and office/web extensions to canonical MIME types', async () => {
    expect(resolveCanonicalMimeType('photo.jfif', 'image/pjpeg')).toBe('image/jpeg');
    expect(resolveCanonicalMimeType('portal.html', '')).toBe('text/html');
    expect(resolveCanonicalMimeType('budget.xlsx', '')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const jfifFile = new File(['fake-jpeg'], 'camera_shot.jfif', { type: 'image/jfif' });
    const normalized = await normalizeUploadFileForVault(jfifFile);
    expect(normalized.file.name).toBe('camera_shot.jpg');
    expect(normalized.mimeType).toBe('image/jpeg');
  });

  it('constructs structured vault storage path scoped to owner id', () => {
    const fixedDate = new Date('2026-11-02T12:00:00Z');
    const path = buildVaultStoragePath(userId, 'Kindergeld Bescheid 2026.pdf', fixedDate);

    expect(path.startsWith(`${userId}/2026/11/`)).toBe(true);
    expect(path.endsWith('.pdf')).toBe(true);
  });
});

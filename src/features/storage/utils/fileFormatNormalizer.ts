import { resolveCanonicalMimeType, type AllowedMimeType } from '../schemas/storageSchema';

const RASTER_CONVERSION_EXTENSIONS = new Set(['jfif', 'bmp', 'gif', 'avif', 'heic', 'heif']);

const replaceExtensionWithJpg = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length <= 1) {
    return `${fileName}.jpg`;
  }
  parts.pop();
  return `${parts.join('.')}.jpg`;
};

const tryConvertImageToJpegInBrowser = async (file: File): Promise<File | null> => {
  if (
    typeof window === 'undefined' ||
    typeof createImageBitmap !== 'function' ||
    typeof document === 'undefined'
  ) {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      if (!blob) {
        return null;
      }
      const nextName = replaceExtensionWithJpg(file.name);
      return new File([blob], nextName, { type: 'image/jpeg' });
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
};

/**
 * Normalizes any user-selected File before uploading to Supabase Storage:
 * - Converts `.jfif` filenames and MIME types to standard `.jpg` (`image/jpeg`).
 * - Converts `.bmp`, `.gif`, `.avif`, `.heic`/`.heif` in browser via Canvas to `.jpg` when supported.
 * - Resolves missing/generic browser MIME types for `.docx`, `.xlsx`, `.csv`, `.html`, `.md`, `.txt`, `.json`, `.xml`.
 */
export const normalizeUploadFileForVault = async (
  rawFile: File
): Promise<{ readonly file: File; readonly mimeType: AllowedMimeType | null }> => {
  const ext = rawFile.name.split('.').pop()?.trim().toLowerCase() ?? '';

  if (RASTER_CONVERSION_EXTENSIONS.has(ext)) {
    const converted = await tryConvertImageToJpegInBrowser(rawFile);
    if (converted) {
      return { file: converted, mimeType: 'image/jpeg' };
    }
    if (ext === 'heic' || ext === 'heif') {
      throw new Error(
        'Форматът HEIC/HEIF не може да бъде преобразуван в този браузър. Моля, използвайте Safari или качете JPEG/PNG.'
      );
    }
    if (ext === 'jfif') {
      const renamed = new File([rawFile], replaceExtensionWithJpg(rawFile.name), {
        type: 'image/jpeg',
      });
      return { file: renamed, mimeType: 'image/jpeg' };
    }
  }

  const canonicalMime = resolveCanonicalMimeType(rawFile.name, rawFile.type);
  if (!canonicalMime) {
    return { file: rawFile, mimeType: null };
  }

  if (rawFile.type !== canonicalMime) {
    const normalizedFile = new File([rawFile], rawFile.name, { type: canonicalMime });
    return { file: normalizedFile, mimeType: canonicalMime };
  }

  return { file: rawFile, mimeType: canonicalMime };
};

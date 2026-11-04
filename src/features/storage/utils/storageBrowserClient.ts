import { createBrowserSupabaseClient } from '@/lib/supabase/supabaseBrowser';

const DEFAULT_STORAGE_BUCKET = 'kronos-vault';

export const uploadFileToSignedVaultUrl = async (
  storagePath: string,
  token: string,
  file: Blob,
  mimeType: string
): Promise<void> => {
  try {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.storage
      .from(DEFAULT_STORAGE_BUCKET)
      .uploadToSignedUrl(storagePath, token, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message || 'Неуспешно директно качване на файла в сейфа.');
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при директно качване към сейфа.';
    throw new Error(msg, { cause: err });
  }
};

export const downloadBytesFromSignedUrl = async (
  signedUrl: string
): Promise<Uint8Array> => {
  try {
    const response = await fetch(signedUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Грешка при изтегляне на файл (статус ${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Неуспешно изтегляне на съдържанието на файла.';
    throw new Error(msg, { cause: err });
  }
};

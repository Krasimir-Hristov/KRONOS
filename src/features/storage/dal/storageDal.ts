import 'server-only';
import { getSupabaseConfig } from '@/config/envConfig';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  buildVaultStoragePath,
  storageUploadRequestSchema,
  type StorageUploadRequestInput,
} from '../schemas/storageSchema';

export interface SignedUploadResult {
  readonly storagePath: string;
  readonly signedUrl: string;
  readonly token: string;
}

export interface SignedDownloadResult {
  readonly signedUrl: string;
}

export interface PurgeStorageResult {
  readonly ok: true;
  readonly purgedCount: number;
}

export const createVaultSignedUploadUrl = async (
  input: StorageUploadRequestInput
): Promise<SignedUploadResult> => {
  try {
    const { userId } = await requireAuthAndPin();
    const validated = storageUploadRequestSchema.parse(input);

    const storagePath = buildVaultStoragePath(userId, validated.fileName);
    const { storageBucket } = getSupabaseConfig();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw new Error(`Неуспешно генериране на URL за качване: ${error?.message ?? 'Непозната грешка'}`);
    }

    return {
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при подготовка за качване в сейфа.';
    throw new Error(msg, { cause: err });
  }
};

export const createVaultSignedDownloadUrl = async (
  storagePath: string,
  expiresInSeconds = 3600
): Promise<SignedDownloadResult> => {
  try {
    const { userId } = await requireAuthAndPin();

    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Нямате права за достъп до този файл.');
    }

    const { storageBucket } = getSupabaseConfig();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error('Неуспешно генериране на линк за сваляне.');
    }

    return { signedUrl: data.signedUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при сваляне от сейфа.';
    throw new Error(msg, { cause: err });
  }
};

export const purgeVaultStorageObjects = async (
  storagePaths: readonly string[]
): Promise<PurgeStorageResult> => {
  try {
    const { userId } = await requireAuthAndPin();

    const authorizedPaths = storagePaths.filter((p) => p.startsWith(`${userId}/`));
    if (authorizedPaths.length === 0) {
      return { ok: true, purgedCount: 0 };
    }

    const { storageBucket } = getSupabaseConfig();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.storage
      .from(storageBucket)
      .remove(authorizedPaths as string[]);

    if (error) {
      throw new Error(`Грешка при физическо изтриване: ${error.message}`);
    }

    return { ok: true, purgedCount: authorizedPaths.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при Hard Purge в сториджа.';
    throw new Error(msg, { cause: err });
  }
};

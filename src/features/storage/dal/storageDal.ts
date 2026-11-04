import 'server-only';
import crypto from 'node:crypto';
import { getSupabaseConfig } from '@/config/envConfig';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  buildVaultStoragePath,
  storageUploadRequestSchema,
  type StorageUploadRequestInput,
} from '../schemas/storageSchema';

export interface SignedUploadResult {
  readonly bucket: string;
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

export interface DownloadedVaultObject {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export interface VaultObjectMetadata {
  readonly sizeBytes: number;
  readonly mimeType: string;
}

export interface StagedPurgeObject {
  readonly originalPath: string;
  readonly stagedPath: string;
}

export const createVaultSignedUploadUrl = async (
  input: StorageUploadRequestInput
): Promise<SignedUploadResult> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const validated = storageUploadRequestSchema.parse(input);

    const storagePath = buildVaultStoragePath(userId, validated.fileName);
    const { storageBucket } = getSupabaseConfig();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('[StorageDal] createSignedUploadUrl failed:', error);
      throw new Error('Неуспешно генериране на защитен URL за качване.');
    }

    return {
      bucket: storageBucket,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  } catch (err) {
    console.error('[StorageDal] Prepare upload error:', err);
    throw new Error('Грешка при подготовка за качване в сейфа.', { cause: err });
  }
};

export const getVaultObjectMetadata = async (
  storagePath: string
): Promise<VaultObjectMetadata> => {
  const { userId } = await requireAuthAndPin({ redirectOnFail: false });
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('Нямате права за достъп до този обект в сториджа.');
  }

  const { storageBucket } = getSupabaseConfig();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .info(storagePath);

  if (error || !data) {
    throw new Error('Каченият файл не беше намерен в хранилището.');
  }

  const metaRecord =
    data.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : null;

  const rawSize =
    typeof data.size === 'number'
      ? data.size
      : typeof metaRecord?.size === 'number'
        ? metaRecord.size
        : Number(metaRecord?.size ?? 0);

  const rawMime =
    typeof data.contentType === 'string' && data.contentType.length > 0
      ? data.contentType
      : typeof metaRecord?.mimetype === 'string'
        ? metaRecord.mimetype
        : '';

  const normalizedMime = rawMime.split(';')[0]?.trim().toLowerCase() ?? '';

  return {
    sizeBytes: Number.isFinite(rawSize) ? rawSize : 0,
    mimeType: normalizedMime,
  };
};

export const createVaultSignedDownloadUrl = async (
  storagePath: string,
  expiresInSeconds = 3600
): Promise<SignedDownloadResult> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });

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

export const downloadVaultObjectBytes = async (
  storagePath: string
): Promise<DownloadedVaultObject> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });

    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Нямате права за четене на този файл.');
    }

    const { storageBucket } = getSupabaseConfig();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .download(storagePath);

    if (error || !data) {
      throw new Error('Неуспешно прочитане на файла от сейфа за OCR обработка.');
    }

    const arrayBuffer = await data.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      mimeType: data.type || 'application/octet-stream',
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Грешка при четене на файл от сториджа.';
    throw new Error(msg, { cause: err });
  }
};

export const restoreStagedVaultObjects = async (
  staged: readonly StagedPurgeObject[]
): Promise<void> => {
  if (staged.length === 0) return;
  const { storageBucket } = getSupabaseConfig();
  const supabase = await createServerSupabaseClient();
  for (const item of staged) {
    const { error } = await supabase.storage
      .from(storageBucket)
      .move(item.stagedPath, item.originalPath);
    if (error) {
      console.error('[StorageDal] Rollback move failed:', error);
    }
  }
};

export const stageVaultObjectsForPurge = async (
  storagePaths: readonly string[]
): Promise<readonly StagedPurgeObject[]> => {
  const { userId } = await requireAuthAndPin({ redirectOnFail: false });
  const authorized = storagePaths.filter((p) => p.startsWith(`${userId}/`));
  if (authorized.length === 0) return [];

  const { storageBucket } = getSupabaseConfig();
  const supabase = await createServerSupabaseClient();
  const batchId = crypto.randomUUID();
  const staged: StagedPurgeObject[] = [];

  for (let i = 0; i < authorized.length; i += 1) {
    const originalPath = authorized[i]!;
    const stagedPath = `${userId}/.purge_stage/${batchId}_${i}`;
    const { error } = await supabase.storage
      .from(storageBucket)
      .move(originalPath, stagedPath);

    if (error) {
      await restoreStagedVaultObjects(staged);
      throw new Error('Неуспешна подготовка на файловете за физическо изтриване.');
    }
    staged.push({ originalPath, stagedPath });
  }

  return staged;
};

export const commitStagedVaultPurge = async (
  staged: readonly StagedPurgeObject[]
): Promise<void> => {
  if (staged.length === 0) return;
  const { storageBucket } = getSupabaseConfig();
  const supabase = await createServerSupabaseClient();
  const paths = staged.map((s) => s.stagedPath);

  const firstAttempt = await supabase.storage.from(storageBucket).remove(paths);
  if (!firstAttempt.error) return;

  const retryAttempt = await supabase.storage.from(storageBucket).remove(paths);
  if (retryAttempt.error) {
    console.error('[StorageDal] Commit purge remove failed:', retryAttempt.error);
    throw new Error('Грешка при окончателното изтриване на файловете от сториджа.');
  }
};

export const purgeVaultStorageObjects = async (
  storagePaths: readonly string[]
): Promise<PurgeStorageResult> => {
  const { userId } = await requireAuthAndPin({ redirectOnFail: false });
  const authorizedPaths = storagePaths.filter((p) => p.startsWith(`${userId}/`));
  if (authorizedPaths.length === 0) {
    return { ok: true, purgedCount: 0 };
  }

  const { storageBucket } = getSupabaseConfig();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage
    .from(storageBucket)
    .remove([...authorizedPaths]);

  if (error) {
    console.error('[StorageDal] purgeVaultStorageObjects error:', error);
    throw new Error('Грешка при Hard Purge в сториджа.');
  }

  return { ok: true, purgedCount: authorizedPaths.length };
};

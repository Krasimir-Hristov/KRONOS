import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  KRONOS_PIN_SECRET: z.string().min(32).optional(),
  KRONOS_VAULT_ENCRYPTION_KEY: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('kronos-vault'),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
});

export type PublicEnvConfig = z.infer<typeof publicEnvSchema>;
export type ServerEnvConfig = z.infer<typeof serverEnvSchema>;

export type EnvValidationResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errorMessage: string };

export const parseServerEnv = (
  rawEnv: Record<string, string | undefined> = process.env
): EnvValidationResult<ServerEnvConfig> => {
  try {
    const parsed = serverEnvSchema.safeParse(rawEnv);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: 'Невалидна сървърна конфигурация на средата (.env).',
      };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      errorMessage: 'Неочаквана грешка при валидиране на променливите на средата.',
    };
  }
};

export const parsePublicEnv = (): EnvValidationResult<PublicEnvConfig> => {
  try {
    const parsed = publicEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: 'Невалидна публична конфигурация на приложението.',
      };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      errorMessage: 'Неочаквана грешка при четене на публичната конфигурация.',
    };
  }
};

export const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Липсва NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY в .env конфигурацията.'
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'kronos-vault';

  return { url, publishableKey, serviceRoleKey, storageBucket };
};

export const getCryptoSecrets = () => {
  const pinSecret = process.env.KRONOS_PIN_SECRET;
  const vaultKey = process.env.KRONOS_VAULT_ENCRYPTION_KEY;

  if (!pinSecret || pinSecret.length < 32) {
    throw new Error('Липсва или е невалиден KRONOS_PIN_SECRET (минимум 32 символа).');
  }

  if (!vaultKey || vaultKey.length < 32) {
    throw new Error('Липсва или е невалиден KRONOS_VAULT_ENCRYPTION_KEY (минимум 32 символа).');
  }

  return { pinSecret, vaultKey };
};

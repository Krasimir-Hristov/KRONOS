'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  vaultFactInputSchema,
  vaultFactUpdateSchema,
  vaultSecretInputSchema,
  vaultSecretUpdateSchema,
  type VaultFactItem,
  type VaultSecretMaskedItem,
} from '../schemas/vaultSchema';
import {
  createVaultFact,
  listVaultFacts,
  purgeVaultFact,
  updateVaultFact,
} from './vaultFactsDal';
import {
  createVaultSecret,
  listVaultSecretsMasked,
  purgeVaultSecret,
  revealVaultSecretValue,
  updateVaultSecret,
} from './vaultSecretsDal';

export type VaultActionResponse<T = undefined> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errorMessage: string;
      readonly requiresStepUp?: boolean;
    };

const idSchema = z.object({ id: z.string().uuid('Невалидно ID на запис.') });

const mapVaultError = (err: unknown, fallbackMessage: string): VaultActionResponse<never> => {
  if (err instanceof Error && err.message === 'STEP_UP_PIN_REQUIRED') {
    return {
      ok: false,
      errorMessage: 'Потвърдете вашия 4-цифрен ПИН за достъп до секция Пароли.',
      requiresStepUp: true,
    };
  }
  return {
    ok: false,
    errorMessage: err instanceof Error ? err.message : fallbackMessage,
  };
};

export const fetchVaultFactsAction = async (): Promise<
  VaultActionResponse<readonly VaultFactItem[]>
> => {
  try {
    const items = await listVaultFacts();
    return { ok: true, data: items };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно зареждане на личните данни.');
  }
};

export const createVaultFactAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<{ readonly id: string }>> => {
  try {
    const parsed = vaultFactInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни входни данни.',
      };
    }
    const id = await createVaultFact(parsed.data);
    revalidatePath('/vault');
    return { ok: true, data: { id } };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно запазване на записа.');
  }
};

export const updateVaultFactAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<null>> => {
  try {
    const parsed = vaultFactUpdateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни данни за редакция.',
      };
    }
    await updateVaultFact(parsed.data);
    revalidatePath('/vault');
    return { ok: true, data: null };
  } catch (err) {
    return mapVaultError(err, 'Неуспешна промяна на записа.');
  }
};

export const deleteVaultFactAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<null>> => {
  try {
    const parsed = idSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден идентификатор.' };
    }
    await purgeVaultFact(parsed.data.id);
    revalidatePath('/vault');
    return { ok: true, data: null };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно изтриване на записа.');
  }
};

export const fetchVaultSecretsAction = async (): Promise<
  VaultActionResponse<readonly VaultSecretMaskedItem[]>
> => {
  try {
    const items = await listVaultSecretsMasked();
    return { ok: true, data: items };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно зареждане на паролите.');
  }
};

export const revealVaultSecretAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<{ readonly plainSecret: string }>> => {
  try {
    const parsed = idSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден идентификатор на парола.' };
    }
    const plainSecret = await revealVaultSecretValue(parsed.data.id);
    return { ok: true, data: { plainSecret } };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно декриптиране на паролата.');
  }
};

export const createVaultSecretAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<{ readonly id: string }>> => {
  try {
    const parsed = vaultSecretInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни данни за парола.',
      };
    }
    const id = await createVaultSecret(parsed.data);
    revalidatePath('/vault');
    return { ok: true, data: { id } };
  } catch (err) {
    return mapVaultError(err, 'Неуспешен запис на паролата.');
  }
};

export const updateVaultSecretAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<null>> => {
  try {
    const parsed = vaultSecretUpdateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни данни за промяна.',
      };
    }
    await updateVaultSecret(parsed.data);
    revalidatePath('/vault');
    return { ok: true, data: null };
  } catch (err) {
    return mapVaultError(err, 'Неуспешна промяна на паролата.');
  }
};

export const deleteVaultSecretAction = async (
  rawInput: unknown
): Promise<VaultActionResponse<null>> => {
  try {
    const parsed = idSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'Невалиден идентификатор на парола.' };
    }
    await purgeVaultSecret(parsed.data.id);
    revalidatePath('/vault');
    return { ok: true, data: null };
  } catch (err) {
    return mapVaultError(err, 'Неуспешно изтриване на паролата.');
  }
};

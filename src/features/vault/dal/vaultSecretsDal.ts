import 'server-only';
import { getCryptoSecrets } from '@/config/envConfig';
import { requireStepUpPin } from '@/features/auth/server';
import { decryptAesGcm, encryptAesGcm } from '@/lib/crypto/aesGcmCrypto';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  vaultCategorySchema,
  vaultSecretInputSchema,
  vaultSecretUpdateSchema,
  type VaultSecretInput,
  type VaultSecretMaskedItem,
  type VaultSecretUpdateInput,
} from '../schemas/vaultSchema';

export const listVaultSecretsMasked = async (): Promise<
  readonly VaultSecretMaskedItem[]
> => {
  try {
    const { userId } = await requireStepUpPin();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('vault_items')
      .select('id, category, label, username_or_hint, updated_at')
      .eq('owner_id', userId)
      .eq('is_secret', true)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error('Неуспешно зареждане на списъка с пароли.');
    }

    return (data ?? []).map((row) => {
      const catParsed = vaultCategorySchema.safeParse(row.category);
      return {
        id: row.id,
        category: catParsed.success ? catParsed.data : 'other',
        label: row.label,
        usernameOrHint: row.username_or_hint,
        updatedAt: row.updated_at,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при достъп до паролите.';
    throw new Error(msg, { cause: err });
  }
};

export const revealVaultSecretValue = async (secretId: string): Promise<string> => {
  try {
    const { userId } = await requireStepUpPin();
    const { vaultKey } = getCryptoSecrets();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('vault_items')
      .select('value_encrypted')
      .eq('id', secretId)
      .eq('owner_id', userId)
      .eq('is_secret', true)
      .single();

    if (error || !data?.value_encrypted) {
      throw new Error('Паролата не е намерена.');
    }

    const decrypted = decryptAesGcm(data.value_encrypted, vaultKey);
    if (decrypted === null) {
      throw new Error('Неуспешно декриптиране на паролата.');
    }

    return decrypted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при разкриване на парола.';
    throw new Error(msg, { cause: err });
  }
};

export const createVaultSecret = async (input: VaultSecretInput): Promise<string> => {
  try {
    const { userId } = await requireStepUpPin();
    const validated = vaultSecretInputSchema.parse(input);
    const { vaultKey } = getCryptoSecrets();

    const encryptedValue = encryptAesGcm(validated.secretValue, vaultKey);
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('vault_items')
      .insert({
        owner_id: userId,
        category: validated.category,
        label: validated.label,
        username_or_hint: validated.usernameOrHint ?? null,
        is_secret: true,
        value_plain: null,
        value_encrypted: encryptedValue,
        source_document_id: null,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Неуспешен запис на криптираната парола.');
    }

    return data.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при запис на парола.';
    throw new Error(msg, { cause: err });
  }
};

export const updateVaultSecret = async (
  input: VaultSecretUpdateInput
): Promise<void> => {
  try {
    const { userId } = await requireStepUpPin();
    const validated = vaultSecretUpdateSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const updatePayload: {
      category: string;
      label: string;
      username_or_hint: string | null;
      value_encrypted?: string;
    } = {
      category: validated.category,
      label: validated.label,
      username_or_hint: validated.usernameOrHint ?? null,
    };

    if (validated.secretValue && validated.secretValue.length > 0) {
      const { vaultKey } = getCryptoSecrets();
      updatePayload.value_encrypted = encryptAesGcm(validated.secretValue, vaultKey);
    }

    const { error } = await supabase
      .from('vault_items')
      .update(updatePayload)
      .eq('id', validated.id)
      .eq('owner_id', userId)
      .eq('is_secret', true);

    if (error) {
      throw new Error('Неуспешна промяна на паролата.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при редакция на парола.';
    throw new Error(msg, { cause: err });
  }
};

export const purgeVaultSecret = async (secretId: string): Promise<void> => {
  try {
    const { userId } = await requireStepUpPin();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('vault_items')
      .delete()
      .eq('id', secretId)
      .eq('owner_id', userId)
      .eq('is_secret', true);

    if (error) {
      throw new Error('Неуспешно физическо изтриване на паролата.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при Hard Purge на парола.';
    throw new Error(msg, { cause: err });
  }
};

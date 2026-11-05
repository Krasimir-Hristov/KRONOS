import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCryptoSecrets } from '@/config/envConfig';
import { PIN_COOKIE_NAME, STEP_UP_PIN_COOKIE_NAME } from '@/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { ProfileRow } from '@/types/databaseTypes';
import { verifyEncryptedPinCookie } from './pinCrypto';

export interface VerifiedAuthContext {
  readonly userId: string;
  readonly email: string;
  readonly profile: ProfileRow;
}

export type PinStatusErrorCode = 'PROFILE_LOAD_FAILED' | 'UNEXPECTED_ERROR';

export interface UserPinStatus {
  readonly hasPin: boolean;
  readonly isError: boolean;
  readonly errorCode?: PinStatusErrorCode;
}

export const getUserPinStatus = async (userId: string): Promise<UserPinStatus> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return {
        hasPin: false,
        isError: true,
        errorCode: 'PROFILE_LOAD_FAILED',
      };
    }

    return {
      hasPin: Boolean(profile.pin_hash),
      isError: false,
    };
  } catch {
    return {
      hasPin: false,
      isError: true,
      errorCode: 'UNEXPECTED_ERROR',
    };
  }
};

export const requireAuthAndPin = async (
  options: { readonly redirectOnFail?: boolean } = { redirectOnFail: true }
): Promise<VerifiedAuthContext> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (options.redirectOnFail) {
      redirect('/login');
    }
    throw new Error('Неоторизиран достъп. Моля, влезте в системата.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    if (options.redirectOnFail) {
      redirect('/login');
    }
    throw new Error('Липсва потребителски профил.');
  }

  const cookieStore = await cookies();
  const pinCookie = cookieStore.get(PIN_COOKIE_NAME)?.value;
  const { pinSecret } = getCryptoSecrets();

  const isPinValid = verifyEncryptedPinCookie(pinCookie, user.id, pinSecret, 'session');
  if (!isPinValid) {
    if (options.redirectOnFail) {
      redirect('/pin');
    }
    throw new Error('Необходима е верификация с 4-цифрен ПИН код.');
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
  };
};

export const requireStepUpPin = async (): Promise<VerifiedAuthContext> => {
  const context = await requireAuthAndPin({ redirectOnFail: false });
  const cookieStore = await cookies();
  const stepUpCookie = cookieStore.get(STEP_UP_PIN_COOKIE_NAME)?.value;
  const { pinSecret } = getCryptoSecrets();

  const isStepUpValid = verifyEncryptedPinCookie(
    stepUpCookie,
    context.userId,
    pinSecret,
    'step_up'
  );

  if (!isStepUpValid) {
    throw new Error('STEP_UP_PIN_REQUIRED');
  }

  return context;
};

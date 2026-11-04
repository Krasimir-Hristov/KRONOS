'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCryptoSecrets } from '@/config/envConfig';
import { PIN_COOKIE_NAME, STEP_UP_PIN_COOKIE_NAME } from '@/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  loginSchema,
  pinSchema,
  pinSetupSchema,
} from '../schemas/authSchema';
import {
  createEncryptedPinCookie,
  hashPin,
  verifyPinHash,
} from './pinCrypto';

const PIN_TTL_MINUTES = 15;
const STEP_UP_TTL_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export type ActionResponse<T = Record<string, unknown>> =
  | { readonly ok: true; readonly data?: T }
  | { readonly ok: false; readonly errorMessage: string };

export const signInAction = async (
  input: unknown
): Promise<ActionResponse<{ readonly hasPin: boolean }>> => {
  try {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни входни данни.',
      };
    }

    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError || !authData.user) {
      return { ok: false, errorMessage: 'Грешен имейл или парола.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', authData.user.id)
      .single();

    return { ok: true, data: { hasPin: Boolean(profile?.pin_hash) } };
  } catch {
    return { ok: false, errorMessage: 'Неочаквана грешка при вход в системата.' };
  }
};

export const setupOrVerifyPinAction = async (input: unknown): Promise<ActionResponse> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, errorMessage: 'Необходим е вход с имейл и парола.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!profile) {
      return { ok: false, errorMessage: 'Профилът не е намерен.' };
    }

    const { pinSecret } = getCryptoSecrets();
    const cookieStore = await cookies();

    if (!profile.pin_hash) {
      const parsedSetup = pinSetupSchema.safeParse(input);
      if (!parsedSetup.success) {
        return {
          ok: false,
          errorMessage: parsedSetup.error.issues[0]?.message ?? 'Невалиден ПИН код.',
        };
      }

      const newPinHash = hashPin(parsedSetup.data.pin);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pin_hash: newPinHash,
          pin_failed_attempts: 0,
          pin_locked_until: null,
        })
        .eq('id', user.id);

      if (updateError) {
        return { ok: false, errorMessage: 'Грешка при запис на новия ПИН код.' };
      }

      const cookieVal = createEncryptedPinCookie(user.id, PIN_TTL_MINUTES, pinSecret);
      cookieStore.set(PIN_COOKIE_NAME, cookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PIN_TTL_MINUTES * 60,
      });

      return { ok: true };
    }

    if (
      profile.pin_locked_until &&
      new Date(profile.pin_locked_until).getTime() > Date.now()
    ) {
      return {
        ok: false,
        errorMessage: 'ПИН кодът е заключен поради грешни опити. Изчакайте 15 минути.',
      };
    }

    const parsedPin = pinSchema.safeParse(input);
    if (!parsedPin.success) {
      return {
        ok: false,
        errorMessage:
          parsedPin.error.issues[0]?.message ?? 'ПИН кодът трябва да съдържа точно 4 цифри.',
      };
    }

    const isMatch = verifyPinHash(parsedPin.data.pin, profile.pin_hash);

    if (isMatch) {
      await supabase
        .from('profiles')
        .update({ pin_failed_attempts: 0, pin_locked_until: null })
        .eq('id', user.id);

      const cookieVal = createEncryptedPinCookie(user.id, PIN_TTL_MINUTES, pinSecret);
      cookieStore.set(PIN_COOKIE_NAME, cookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PIN_TTL_MINUTES * 60,
      });

      return { ok: true };
    }

    const nextFailed = (profile.pin_failed_attempts ?? 0) + 1;
    const isNowLocked = nextFailed >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = isNowLocked
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

    await supabase
      .from('profiles')
      .update({
        pin_failed_attempts: isNowLocked ? 0 : nextFailed,
        pin_locked_until: lockedUntil,
      })
      .eq('id', user.id);

    if (isNowLocked) {
      return {
        ok: false,
        errorMessage: 'Твърде много неуспешни опита. ПИН кодът е заключен за 15 минути.',
      };
    }

    const remaining = MAX_FAILED_ATTEMPTS - nextFailed;
    return { ok: false, errorMessage: `Грешен ПИН код. Остават ${remaining} опита.` };
  } catch {
    return { ok: false, errorMessage: 'Грешка при верификация на ПИН кода.' };
  }
};

export const verifyStepUpPinAction = async (
  input: unknown
): Promise<ActionResponse<{ readonly expiresAtMs: number }>> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, errorMessage: 'Неоторизиран достъп.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', user.id)
      .single();
    if (!profile?.pin_hash) return { ok: false, errorMessage: 'Липсва конфигуриран ПИН.' };

    const parsed = pinSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, errorMessage: 'ПИН кодът трябва да съдържа точно 4 цифри.' };
    }

    if (!verifyPinHash(parsed.data.pin, profile.pin_hash)) {
      return { ok: false, errorMessage: 'Невалиден ПИН код за отключване на пароли.' };
    }

    const { pinSecret } = getCryptoSecrets();
    const cookieStore = await cookies();
    const expiresAtMs = Date.now() + STEP_UP_TTL_MINUTES * 60 * 1000;
    const stepUpCookie = createEncryptedPinCookie(user.id, STEP_UP_TTL_MINUTES, pinSecret);

    cookieStore.set(STEP_UP_PIN_COOKIE_NAME, stepUpCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STEP_UP_TTL_MINUTES * 60,
    });

    return { ok: true, data: { expiresAtMs } };
  } catch {
    return { ok: false, errorMessage: 'Грешка при потвърждаване на Step-Up ПИН.' };
  }
};

export const lockPinAction = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_COOKIE_NAME);
  cookieStore.delete(STEP_UP_PIN_COOKIE_NAME);
  redirect('/pin');
};

export const signOutAction = async (): Promise<void> => {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_COOKIE_NAME);
  cookieStore.delete(STEP_UP_PIN_COOKIE_NAME);
  redirect('/login');
};

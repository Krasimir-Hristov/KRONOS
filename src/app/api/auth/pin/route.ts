import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCryptoSecrets } from '@/config/envConfig';
import { PIN_COOKIE_NAME, STEP_UP_PIN_COOKIE_NAME } from '@/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import {
  pinApiRequestSchema,
  pinSchema,
  pinSetupSchema,
} from '@/features/auth';
import {
  createEncryptedPinCookie,
  hashPin,
  verifyPinHash,
} from '@/features/auth/server';

const PIN_TTL_MINUTES = 15;
const STEP_UP_TTL_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const parsedBody = pinApiRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Невалидни данни в заявката.' },
        { status: 400 }
      );
    }
    const body = parsedBody.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Необходим е вход с имейл и парола.' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Профилът не е намерен.' },
        { status: 404 }
      );
    }

    const { pinSecret } = getCryptoSecrets();
    const cookieStore = await cookies();

    // 1. Initial PIN Setup Flow (When user doesn't have a PIN yet)
    if (!profile.pin_hash) {
      const parsedSetup = pinSetupSchema.safeParse(body);
      if (!parsedSetup.success) {
        return NextResponse.json(
          {
            ok: false,
            errorMessage: parsedSetup.error.issues[0]?.message ?? 'Невалиден ПИН код.',
          },
          { status: 400 }
        );
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
        return NextResponse.json(
          { ok: false, errorMessage: 'Грешка при запис на новия ПИН код.' },
          { status: 500 }
        );
      }

      const cookieVal = createEncryptedPinCookie(
        user.id,
        PIN_TTL_MINUTES,
        pinSecret,
        'session'
      );
      cookieStore.set(PIN_COOKIE_NAME, cookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PIN_TTL_MINUTES * 60,
      });

      return NextResponse.json({ ok: true });
    }

    // 2. Lockout Check (Applies to both standard session PIN and Step-Up PIN)
    if (
      profile.pin_locked_until &&
      new Date(profile.pin_locked_until).getTime() > Date.now()
    ) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: 'ПИН кодът е заключен поради грешни опити. Изчакайте 15 минути.',
        },
        { status: 423 }
      );
    }

    // 3. Validate PIN format
    const parsedPin = pinSchema.safeParse(body);
    if (!parsedPin.success) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage:
            parsedPin.error.issues[0]?.message ?? 'ПИН кодът трябва да съдържа точно 4 цифри.',
        },
        { status: 400 }
      );
    }

    const isMatch = verifyPinHash(parsedPin.data.pin, profile.pin_hash);

    // 4. Handle Matching PIN
    if (isMatch) {
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ pin_failed_attempts: 0, pin_locked_until: null })
        .eq('id', user.id);

      if (resetError) {
        return NextResponse.json(
          { ok: false, errorMessage: 'Грешка при обновяване на статуса.' },
          { status: 500 }
        );
      }

      if (body.isStepUp) {
        const expiresAtMs = Date.now() + STEP_UP_TTL_MINUTES * 60 * 1000;
        const stepUpCookie = createEncryptedPinCookie(
          user.id,
          STEP_UP_TTL_MINUTES,
          pinSecret,
          'step_up'
        );

        cookieStore.set(STEP_UP_PIN_COOKIE_NAME, stepUpCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: STEP_UP_TTL_MINUTES * 60,
        });

        return NextResponse.json({ ok: true, data: { expiresAtMs } });
      }

      const cookieVal = createEncryptedPinCookie(
        user.id,
        PIN_TTL_MINUTES,
        pinSecret,
        'session'
      );
      cookieStore.set(PIN_COOKIE_NAME, cookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PIN_TTL_MINUTES * 60,
      });

      return NextResponse.json({ ok: true });
    }

    // 5. Handle Mismatched PIN (Atomic lockout count update)
    const nextFailed = (profile.pin_failed_attempts ?? 0) + 1;
    const isNowLocked = nextFailed >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = isNowLocked
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pin_failed_attempts: isNowLocked ? 0 : nextFailed,
        pin_locked_until: lockedUntil,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Грешка при обновяване на брояча за грешки.' },
        { status: 500 }
      );
    }

    if (isNowLocked) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: 'Твърде много неуспешни опита. ПИН кодът е заключен за 15 минути.',
        },
        { status: 423 }
      );
    }

    const remaining = MAX_FAILED_ATTEMPTS - nextFailed;
    return NextResponse.json(
      { ok: false, errorMessage: `Грешен ПИН код. Остават ${remaining} опита.` },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, errorMessage: 'Неочаквана грешка при обработка на ПИН кода.' },
      { status: 500 }
    );
  }
};

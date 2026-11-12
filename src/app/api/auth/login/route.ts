import { NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const MAX_TRACKED_IPS = 1000;
const ipAttempts = new Map<string, number[]>();

const cleanupExpiredAttempts = (now: number): void => {
  for (const [ip, timestamps] of ipAttempts.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      ipAttempts.delete(ip);
    } else if (valid.length !== timestamps.length) {
      ipAttempts.set(ip, valid);
    }
  }
};

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();

  if (ipAttempts.size > MAX_TRACKED_IPS / 2) {
    cleanupExpiredAttempts(now);
  }

  if (ipAttempts.size >= MAX_TRACKED_IPS && !ipAttempts.has(ip)) {
    const oldestKey = ipAttempts.keys().next().value;
    if (oldestKey) {
      ipAttempts.delete(oldestKey);
    }
  }

  const timestamps = ipAttempts.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_LOGIN_ATTEMPTS) {
    ipAttempts.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipAttempts.set(ip, recent);
  return false;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstForwarded = forwarded ? forwarded.split(',')[0]?.trim() : null;
    const clientIp = firstForwarded || request.headers.get('x-real-ip') || '127.0.0.1';

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: 'Твърде много опити за вход. Моля, изчакайте една минута.',
        },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: parsed.error.issues[0]?.message ?? 'Невалидни входни данни.',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Грешен имейл или парола.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, userId: authData.user.id });
  } catch {
    return NextResponse.json(
      { ok: false, errorMessage: 'Неочаквана грешка при вход в системата.' },
      { status: 500 }
    );
  }
};

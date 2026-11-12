import { NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
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

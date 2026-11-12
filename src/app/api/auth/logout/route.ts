import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PIN_COOKIE_NAME, STEP_UP_PIN_COOKIE_NAME } from '@/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

export const POST = async (): Promise<NextResponse> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      return NextResponse.json(
        { ok: false, errorMessage: 'Грешка при отписване от системата.' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete(PIN_COOKIE_NAME);
    cookieStore.delete(STEP_UP_PIN_COOKIE_NAME);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, errorMessage: 'Неочаквана грешка при изход.' },
      { status: 500 }
    );
  }
};

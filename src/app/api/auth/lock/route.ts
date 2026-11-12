import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PIN_COOKIE_NAME, STEP_UP_PIN_COOKIE_NAME } from '@/proxy';

export const POST = async (): Promise<NextResponse> => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(PIN_COOKIE_NAME);
    cookieStore.delete(STEP_UP_PIN_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, errorMessage: 'Грешка при заключване.' },
      { status: 500 }
    );
  }
};

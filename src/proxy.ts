import { NextResponse, type NextRequest } from 'next/server';
import { scrubExternalHeaders } from '@/lib/security/headerScrubber';

export const PIN_COOKIE_NAME = 'kronos_pin_verified' as const;
export const STEP_UP_PIN_COOKIE_NAME = 'kronos_vault_unlocked' as const;

/**
 * Next.js 16 Network Boundary Proxy (replaces deprecated middleware.ts).
 *
 * Responsibilities:
 * 1. Enforce CVE-2025-29927 Allowlist Header Scrubbing on every incoming request.
 * 2. Enforce Supabase Auth + 15-minute sliding 4-digit PIN verification (wired in Phase 1).
 */
export const proxy = (request: NextRequest): NextResponse => {
  try {
    const scrubbedHeaders = scrubExternalHeaders(request.headers);

    const response = NextResponse.next({
      request: {
        headers: scrubbedHeaders,
      },
    });

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch {
    return new NextResponse('Service temporarily unavailable.', { status: 503 });
  }
};

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

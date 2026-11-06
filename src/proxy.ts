import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { scrubExternalHeaders } from '@/lib/security/headerScrubber';
import { getCryptoSecrets, getSupabaseConfig } from '@/config/envConfig';
import {
  createEncryptedPinCookie,
  verifyEncryptedPinCookie,
} from '@/features/auth/server';
import type { Database } from '@/types/databaseTypes';

export const PIN_COOKIE_NAME = 'kronos_pin_verified' as const;
export const STEP_UP_PIN_COOKIE_NAME = 'kronos_vault_unlocked' as const;
const PIN_TTL_MINUTES = 15;
const PIN_TTL_SECONDS = PIN_TTL_MINUTES * 60;

const applySecurityHeaders = (res: NextResponse): NextResponse => {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
};

const createRedirectWithCookies = (
  url: URL,
  sourceResponse: NextResponse
): NextResponse => {
  const redirectRes = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectRes.cookies.set(cookie.name, cookie.value, cookie);
  });
  return applySecurityHeaders(redirectRes);
};

const isPublicRoute = (pathname: string): boolean => {
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/cron/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon' ||
    pathname === '/apple-icon' ||
    pathname.startsWith('/_next')
  ) {
    return true;
  }
  return false;
};

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const scrubbedHeaders = scrubExternalHeaders(request.headers);
    const { pathname } = request.nextUrl;

    let response = NextResponse.next({
      request: {
        headers: scrubbedHeaders,
      },
    });

    applySecurityHeaders(response);

    if (isPublicRoute(pathname) && pathname !== '/login') {
      return response;
    }

    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: scrubbedHeaders,
            },
          });
          applySecurityHeaders(response);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Unauthenticated users can only visit /login
    if (!user) {
      if (pathname !== '/login') {
        const loginUrl = new URL('/login', request.url);
        return createRedirectWithCookies(loginUrl, response);
      }
      return response;
    }

    // 2. Check 4-digit PIN verification cookie presence, purpose ('session'), and cryptographic validity
    const pinCookie = request.cookies.get(PIN_COOKIE_NAME)?.value;
    const { pinSecret } = getCryptoSecrets();
    const isPinValid = verifyEncryptedPinCookie(
      pinCookie,
      user.id,
      pinSecret,
      'session'
    );

    if (!isPinValid) {
      if (pathname !== '/pin') {
        const pinUrl = new URL('/pin', request.url);
        return createRedirectWithCookies(pinUrl, response);
      }
      return response;
    }

    // 3. User is authenticated and PIN cookie is cryptographically valid: redirect away from auth pages
    if (pathname === '/login' || pathname === '/pin') {
      const homeUrl = new URL('/', request.url);
      return createRedirectWithCookies(homeUrl, response);
    }

    // 4. Sliding PIN TTL on active navigation: regenerate cookie with refreshed payload.exp
    const refreshedCookie = createEncryptedPinCookie(
      user.id,
      PIN_TTL_MINUTES,
      pinSecret,
      'session'
    );
    response.cookies.set(PIN_COOKIE_NAME, refreshedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PIN_TTL_SECONDS,
    });

    return response;
  } catch {
    return new NextResponse('Service temporarily unavailable.', {
      status: 503,
    });
  }
};

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { scrubExternalHeaders } from '@/lib/security/headerScrubber';
import { getSupabaseConfig } from '@/config/envConfig';
import type { Database } from '@/types/databaseTypes';

export const PIN_COOKIE_NAME = 'kronos_pin_verified' as const;
export const STEP_UP_PIN_COOKIE_NAME = 'kronos_vault_unlocked' as const;
const PIN_TTL_SECONDS = 15 * 60;

const isPublicRoute = (pathname: string): boolean => {
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/cron/') ||
    pathname === '/favicon.ico' ||
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

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

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
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }

    // 2. Check 4-digit PIN verification cookie presence at perimeter
    const pinCookie = request.cookies.get(PIN_COOKIE_NAME)?.value;

    if (!pinCookie) {
      if (pathname !== '/pin') {
        const pinUrl = new URL('/pin', request.url);
        return NextResponse.redirect(pinUrl);
      }
      return response;
    }

    // 3. User is authenticated and PIN cookie is present: redirect away from auth pages
    if (pathname === '/login' || pathname === '/pin') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    // 4. Sliding PIN TTL on active navigation
    response.cookies.set(PIN_COOKIE_NAME, pinCookie, {
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

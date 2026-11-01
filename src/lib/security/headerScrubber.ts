/**
 * Defensive Header Filtering (CVE-2025-29927 Mitigation).
 *
 * Strips all external `x-*` headers (including `x-middleware-subrequest`,
 * `x-middleware-*`, `x-invoke-*`, `x-prerender-*`) while preserving only
 * trusted reverse-proxy headers required by Next.js 16 Server Actions CSRF
 * origin verification on Vercel.
 */

const ALLOWED_PROXY_X_HEADERS = new Set<string>([
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-for',
  'x-real-ip',
]);

export const scrubExternalHeaders = (incomingHeaders: Headers): Headers => {
  const sanitized = new Headers(incomingHeaders);
  const namesToDelete: string[] = [];

  sanitized.forEach((_value, name) => {
    const normalized = name.toLowerCase();
    if (normalized.startsWith('x-') && !ALLOWED_PROXY_X_HEADERS.has(normalized)) {
      namesToDelete.push(name);
    }
  });

  for (const headerName of namesToDelete) {
    sanitized.delete(headerName);
  }

  return sanitized;
};

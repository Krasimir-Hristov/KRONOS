---
name: next-16-cache-components
description: Verified Next.js 16.4 rules for cacheComponents: true, proxy.ts (CVE-2025-29927), async request APIs, and Suspense boundaries. Grounded in Context7 (/vercel/next.js/v16.4.5) and node_modules/next/dist/docs/.
---

# Next.js 16.4 Cache Components & Proxy Skill

Always cross-check breaking changes against `node_modules/next/dist/docs/` before writing App Router code.

## 1. `cacheComponents: true` Build Rules

1. **Wrap Dynamic Request Reads in `<Suspense>`:**
   - Reading `cookies()`, `headers()`, `searchParams`, or session data outside a `<Suspense>` boundary causes a build error (`blocking-prerender-runtime`).
   - NEVER `await` auth/session at the top level of `layout.tsx`. Push session checks into an `<AuthGate />` child inside `<Suspense>`.
2. **Forbidden Legacy Segment Configs:**
   - NEVER export `dynamic`, `revalidate`, or `fetchCache` from pages or layouts — they error when `cacheComponents: true` is enabled.
3. **Explicit Caching Directives:**
   - Use `'use cache'` with `cacheLife()` and `cacheTag()` for shared cacheable data.
   - NEVER call `cookies()` or `headers()` inside plain `'use cache'`. Use `'use cache: private'` for browser-scoped session helpers OR pass primitive `userId` into `'use cache'`.
4. **Async Request APIs:**
   - Always `await params`, `await searchParams`, `await cookies()`, and `await headers()`.
   - Run independent async reads concurrently with `Promise.all()`.

## 2. `src/proxy.ts` Perimeter (Strict No-Middleware)

- NEVER create `middleware.ts`.
- Export `proxy(request: NextRequest)` and static `config = { matcher: [...] }` in `src/proxy.ts`.
- Scrub hostile `x-*` headers (specifically `x-middleware-*`) while preserving allowlisted forwarding headers (`x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-for`, `x-real-ip`), then return `NextResponse.next({ request: { headers } })`.
- Always duplicate auth + PIN verification inside DAL and Route Handlers (`requireAuthAndPin()`).

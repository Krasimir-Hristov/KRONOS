# KRONOS (Κρόνος) v2

Личен AI Супервайзър, многоезичен RAG Документен Сейф и сигурно управление на лични данни.

## Технологичен Стек
- **Framework:** Next.js 16.4 (App Router, `cacheComponents: true`, `src/proxy.ts`) + React 19 + TypeScript (Strict, 0 `any`)
- **Styling & Animations:** Tailwind CSS v4 (`bg-linear-to-*`) + Motion for React (`motion/react`) + `next-intl` (`bg`, `en`, `el`, `de`)
- **AI Orchestration:** LangGraph + LangChain + Jev Fast-Router (OpenRouter) + Postgres Checkpointer (HITL)
- **Database & Storage:** Supabase (Postgres 17 + `pgvector` HNSW + `'simple'` FTS + RLS + Storage адаптер, готов за Cloudflare R2)
- **Security:** `src/proxy.ts` (CVE-2025-29927), Supabase Auth + PIN `HttpOnly` cookie, `AES-256-GCM` UI-Only Password Vault, Double Zod Barrier

## Бързи Команди
```bash
pnpm dev          # Стартиране на Next.js 16 dev сървър
pnpm verify       # Пълен Phase Gate: verify:arch + typecheck + lint + test + build
pnpm verify:arch  # Архитектурен одит (naming, <=300 реда, Arrow Functions, boundaries)
pnpm typecheck    # Next.js typegen + TypeScript проверка (tsc --noEmit)
pnpm lint         # ESLint проверка (0 any)
pnpm test         # Vitest unit & security тестове
pnpm build        # Production build
```

## Документация на Проекта
- Инженерна конституция и правила за агентите: [`AGENTS.md`](./AGENTS.md)
- Поетапен план на разработката: [`ROADMAP.md`](./ROADMAP.md)
- Конфигурация на CodeRabbit ревю: [`.coderabbit.yaml`](./.coderabbit.yaml)

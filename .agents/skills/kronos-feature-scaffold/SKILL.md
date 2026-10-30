---
name: kronos-feature-scaffold
description: >-
  Scaffold or extend an isolated domain module inside src/features/<featureName>/
  in the KRONOS codebase. Use this skill whenever creating a new feature (such as
  auth, documents, chat, finance, or family) or adding components, DAL methods,
  hooks, or Zod schemas to an existing feature.
---

# KRONOS Feature Module Scaffolding Standard

Every domain in KRONOS lives inside `src/features/<featureName>/` (where `<featureName>` is `camelCase`, e.g. `documents`, `chat`, `family`, `finance`, `auth`) and exposes its public surface **exclusively** through `index.ts`.

## Required Directory Layout

```text
src/features/<featureName>/
├── components/           # PascalCase.tsx Arrow Function React components (< 250 lines)
├── dal/                  # camelCase.ts server-only Data Access Layer (Supabase + R2)
├── hooks/                # useCamelCase.ts TanStack Query v5 client hooks
├── schemas/              # camelCaseSchema.ts Zod schemas + z.infer exported types
├── agents/               # (Optional) camelCaseAgent.ts modular LangGraph subagents
└── index.ts              # ONLY public entry point for outside consumers
```

## Mandatory Implementation Checklist

1. **Zod Schema First (`schemas/<name>Schema.ts`)**:
   - Derive data shapes from Drizzle ORM or Zod. Never write `any`.
   - Export both the runtime Zod schema and `type MyType = z.infer<typeof mySchema>`.

2. **Server-Only DAL (`dal/<name>Dal.ts`)**:
   - Start with `import 'server-only';` so client bundles fail at build time if accidentally imported.
   - Always call `await requireAuthAndPin()` at the top of mutating or sensitive queries (Defense in Depth duplicating `src/proxy.ts`).
   - Wrap every database / Cloudflare R2 call in `try/catch`, validate inputs with `safeParse()`, and return a discriminated union `{ ok: true, data } | { ok: false, errorCode }` — never expose raw stack traces.

3. **UI Components (`components/<ComponentName>.tsx`)**:
   - Define with Arrow Function: `export const ComponentName: React.FC<Props> = ({ ... }) => { ... };`.
   - Use semantic HTML5 (`<section>`, `<article>`, `<nav>`, `<main>`), explicit `aria-label` on every interactive control, and Tailwind v4 gradients (`bg-linear-to-*`).
   - Support both **BG** (`bgDictionary.ts`) and **EL** (`elDictionary.ts`) labels via `useLanguage()`.

4. **Verification**:
   - Export only intended symbols in `src/features/<featureName>/index.ts`.
   - Run the `kronos-phase-gate` (`pnpm verify`) to confirm zero boundary or naming violations.

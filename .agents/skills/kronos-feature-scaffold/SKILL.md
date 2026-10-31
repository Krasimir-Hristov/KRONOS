---
name: kronos-feature-scaffold
description: >-
  Scaffold or extend an isolated domain module inside src/features/<featureName>/
  in the KRONOS codebase. Use this skill whenever creating a new feature (such as
  auth, storage, documents, vault, assistant, youtubeStudio, or devArchitect) or
  adding components, DAL methods, hooks, or Zod schemas to an existing feature.
---

# KRONOS Feature Module Scaffolding Standard

Every domain in KRONOS lives inside `src/features/<featureName>/` (where `<featureName>` is `camelCase`, e.g. `auth`, `storage`, `documents`, `vault`, `assistant`) and exposes its public surface **exclusively** through `index.ts`.

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

1. **Zod Schema & Types (`schemas/<name>Schema.ts`)**:
   - Derive types from `src/types/databaseTypes.ts` (Supabase generated types) and Zod (`z.infer<typeof mySchema>`). Never write `any`.

2. **Server-Only DAL & Hard Purge (`dal/<name>Dal.ts`)**:
   - Start with `import 'server-only';`.
   - Always call `await requireAuthAndPin()` (and `await requireStepUpPin()` when reading, updating, or deleting passwords/secrets!).
   - Wrap every Supabase / Cloudflare R2 call in `try/catch`, validate inputs with `safeParse()`, and never return raw stack traces.
   - Enforce **Hard Purge Everywhere**: deleting any entity (via AI Bot or manual Admin UI) must physically remove all associated R2 blobs, database rows, vectors, and query caches.

3. **UI Components (`components/<ComponentName>.tsx`)**:
   - Define with Arrow Function: `export const ComponentName: React.FC<Props> = ({ ... }) => { ... };`.
   - Use semantic HTML5 (`<section>`, `<article>`, `<nav>`, `<main>`), explicit `aria-label` on every interactive element, `next-intl` translations, and Tailwind v4 gradients (`bg-linear-to-*`).

4. **Verification**:
   - Export only public symbols via `src/features/<featureName>/index.ts` and run `pnpm verify`.

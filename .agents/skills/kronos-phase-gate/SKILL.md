---
name: kronos-phase-gate
description: >-
  Run the mandatory KRONOS v4 architecture and quality verification gate.
  Activate this skill before concluding any coding task, feature addition, refactoring,
  or phase milestone to verify file naming (camelCase.ts / PascalCase.tsx), 300-line cap,
  no-middleware policy, Tailwind v4 syntax, strict TypeScript, ESLint, Vitest, and Next.js build.
---

# KRONOS Phase Gate & Architecture Verification

No step or phase in KRONOS may be marked complete until every check in this runbook exits with `0` errors.

## Execution Order

1. **Mechanical Architecture Guard (`verifyArchitecture.mjs`)**:
   Run [verifyArchitecture.mjs](./scripts/verifyArchitecture.mjs) via:
   ```powershell
   pnpm verify:arch
   ```
   This script enforces:
   - Absence of `middleware.ts` / `middleware.js` anywhere in the repo.
   - Strict `camelCase.ts` (logic, DAL, schemas, routers, tests) and `PascalCase.tsx` (React components).
   - Maximum `300` lines per file in `src/` (warns at `250+` lines).
   - Arrow Function React components (no `export function` / `export default function` in `.tsx`).
   - Tailwind CSS v4 gradient syntax (`bg-linear-to-*`, forbidding `bg-gradient-to-*`).
   - Strict feature encapsulation (no deep `@/features/<name>/<subpath>` imports from outside `<name>`).

2. **TypeScript Strict Check**:
   ```powershell
   pnpm typecheck
   ```
   Fix all type mismatches using Drizzle `$inferSelect` / Zod `z.infer` — never introduce `any` or unsafe type assertions.

3. **ESLint Check**:
   ```powershell
   pnpm lint
   ```

4. **Vitest Unit Suite**:
   ```powershell
   pnpm test
   ```
   Ensure critical Zod schemas, security utilities, DAL boundaries, and AI routers have passing unit tests.

5. **Production Next.js 16 Build**:
   ```powershell
   pnpm build
   ```

## Single-Command Gate

Once individual issues are resolved, run the unified command to confirm full green status:
```powershell
pnpm verify
```

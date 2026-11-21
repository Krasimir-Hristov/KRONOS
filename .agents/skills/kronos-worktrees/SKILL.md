---
name: kronos-worktrees
description: Operational playbook for orchestrating KRONOS v2 across 4 isolated Git Worktrees (frontend, backend, testing, security) using the Contract-First -> Unified Phase PR -> CodeRabbit workflow.
---

# KRONOS 4-Worktree Orchestration Playbook

## 1. Directory & Branch Map

| Folder | Branch | Role | Owned Paths |
| :--- | :--- | :--- | :--- |
| `d:\myProjects\kronos` | `feat/phase-X-...` | **Orchestrator** | Contracts (`schemas/`, DB types, migrations), merge, `pnpm verify`, PR to CodeRabbit |
| `d:\myProjects\kronos-frontend` | `wt/frontend` | **Frontend Agent** | `src/components/**`, `src/features/*/components/**`, `src/features/*/hooks/**`, `src/features/departments/*/components/**`, `src/features/departments/*/hooks/**`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `messages/*.json` |
| `d:\myProjects\kronos-backend` | `wt/backend` | **Backend Agent** | `src/features/*/dal/**`, `src/features/*/server.ts`, `src/features/departments/**` *(excluding `components/**` and `hooks/**`)*, `src/app/api/**`, `src/lib/**`, `src/config/**`, `src/proxy.ts`, `supabase/migrations/**` |
| `d:\myProjects\kronos-testing` | `wt/testing` | **Testing Agent** | `src/**/*.test.ts` *(excluding `src/test/security/**`)*, `src/test/mocks/**` |
| `d:\myProjects\kronos-security` | `wt/security` | **Security Agent** | `src/test/security/**`, `scripts/verifyArchitecture.mjs` |

## 2. Phase Execution Sequence

1. **Contract-First (Orchestrator):**
   - Create phase branch `feat/phase-X-<name>` from `main`.
   - Commit shared Zod schemas, TypeScript interfaces, DB migration + `databaseTypes.ts`.
   - Fast-forward / reset the 4 worktree branches (`wt/frontend`, `wt/backend`, `wt/testing`, `wt/security`) onto the Contract commit.
2. **Parallel Execution:**
   - Dispatch tasks to each agent strictly inside its owned paths.
   - Each agent MUST read `AGENTS.md`, `.agents/skills/kronos-lessons/SKILL.md`, and relevant `.agents/skills/*/SKILL.md` first.
3. **Unified Merge, Pre-PR Security Gate & Phase Gate (Orchestrator):**
   - Merge `wt/backend` -> `wt/frontend` -> `wt/testing` -> `wt/security` into `feat/phase-X-<name>`.
   - Have **Security Agent** audit the unified diff against `.agents/skills/kronos-lessons/SKILL.md` and `AGENTS.md`.
   - Run `pnpm verify` (`verify:arch`, `typecheck`, `lint`, `test`, `build`) until 0 errors.
4. **CodeRabbit PR, Lessons Distillation & Educational Debrief:**
   - Push `feat/phase-X-<name>` and open **1 PR to `main`** for CodeRabbit review.
   - Follow `AGENTS.md` Section 7: summarize all CodeRabbit findings and walk through them 1-by-1 interactively with industry-standard solutions before making edits.
   - After resolving review findings, the Orchestrator MUST distill recurring lessons (1 concise line per lesson, max 250 lines total) into `.agents/skills/kronos-lessons/SKILL.md`.
   - Deliver the mandatory **Educational Phase Debrief** (file-by-file map, exports/imports/usage, state & security flow).

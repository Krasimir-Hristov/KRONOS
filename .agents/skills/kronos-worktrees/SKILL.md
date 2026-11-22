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

### Default Model Roster & Quota Fallback (`/teamwork` / `swarm` mode)

When spawning workers in `/teamwork`, pin each worker to its Primary model automatically (and use `swarm(action="model")` to fall back cleanly without losing context if a worker hits quota). **Important:** Quota is shared across reasoning tiers (`Extra High` / `High` / `Medium`) of the same model, so fallbacks ALWAYS switch to a **different model**. **Backend Agent** MUST NEVER drop to `Medium` (only `Extra High` / `High`):

| Role | Primary Model | Quota Fallback Chain (different model) |
| :--- | :--- | :--- |
| **Orchestrator** | `Gemini 4 Neon (Extra High)` | `Claude Opus 5.5 (High)` -> `Claude Sonnet 5.5 (High)` *(or pause until refresh)* |
| **Frontend Agent** | `Gemini 4 Neon (High)` *(use `Extra High` for flagship UI screens like Chat/Neural Canvas/PIN)* | `Gemini 4 Argon (High)` -> `Claude Sonnet 5.5 (High)` |
| **Backend Agent** | `Gemini 4 Neon (Extra High)` *(mandatory always Extra High)* | `Claude Opus 5.5 (High)` -> `Claude Sonnet 5.5 (High)` *(never `Medium`!)* |
| **Testing Agent** | `Gemini 4 Hydrogen (Medium)` | `Gemini 3.8 Flash (Medium)` |
| **Security Agent** | `Claude Opus 5.5 (Medium)` | `Claude Sonnet 5.5 (High)` -> `Gemini 4 Neon (High)` |

## 2. Mandatory 8-Step Phase Execution Sequence (Every New Chat)

When the user starts a new chat for a phase (e.g., "Направи план за Фаза X"), run this exact sequence automatically without asking how the workflow works:

1. **Context Load (Ground Truth Over Docs):** Read `ROADMAP.md`, `.agents/skills/kronos-lessons/SKILL.md`, `.agents/skills/kronos-architecture/SKILL.md`, and `.agents/skills/next-16-cache-components/SKILL.md`, **AND** inspect the actual current state of the codebase (`git status`, `git log`, `src/` tree) and database (Supabase tables/migrations) to reconcile real progress against `ROADMAP.md` before planning (never rely on docs alone).
2. **Phase Plan Artifact (NO code before approval):** Present a plan with `RequestFeedback: true` listing:
   - Scope & architectural decisions for the phase (accounting for already-completed code/DB work);
   - Exact **Contract-First files** to be created first (SQL migrations, DB types, Zod schemas, TypeScript interfaces, API contracts);
   - Explicit per-agent **Briefs** (`Frontend`, `Backend`, `Testing`, `Security`) listing exact owned files.
3. **Contract-First Commit & Safe Zero-Data-Loss Worktree Sync (Orchestrator):**
   - Create phase branch `feat/phase-X-<name>` from `main`.
   - Commit ONLY the shared Contract-First files and share clickable file links with the user.
   - Sync all 4 worktree branches (`wt/frontend`, `wt/backend`, `wt/testing`, `wt/security`) onto the Contract commit `<contract-sha>` safely:
     1. **Protect work first:** In each worktree, check `git status --porcelain` and commits not reachable from `<contract-sha>` (`git log <contract-sha>..HEAD --oneline`). Use `git stash push -u -m "pre-sync-backup"` **only** for uncommitted working-tree changes, and **always** create a backup branch (`git branch backup/wt-<name>-<timestamp> HEAD`) whenever unmerged local commits exist — NEVER run blind `reset --hard`.
     2. **Move branch safely & check alignment:** Before merging, check whether any gitignored files in the worktree collide with tracked paths in `<contract-sha>` (e.g., `git ls-files --others --ignored --exclude-standard` vs `git ls-tree -r --name-only <contract-sha>`), and run `git merge --ff-only --no-overwrite-ignore <contract-sha>`. If merge fails due to a colliding ignored file, back up that ignored file first and NEVER run `git switch -C` until its content is safely preserved. Immediately verify whether `git rev-parse HEAD` equals `<contract-sha>` (a branch ahead of `<contract-sha>` succeeds with "Already up to date" without aligning!). If `ff-only` fails OR `HEAD !== <contract-sha>`, ensure step 1 (and any ignored-file backup) preserved local work, then realign cleanly with `git switch -C wt/<name> <contract-sha>`.
     3. **Final SHA verification:** Run `git rev-parse HEAD` in all 4 worktrees and confirm every branch matches `<contract-sha>`.
4. **Parallel Execution (4 Agents):**
   - Dispatch tasks in parallel to the 4 agents inside their owned worktree paths (using the Model Roster above in `/teamwork`, or inheriting the active model otherwise).
   - Each agent MUST read `AGENTS.md`, `.agents/skills/kronos-lessons/SKILL.md`, and relevant `.agents/skills/*/SKILL.md` first.
5. **Unified Merge, Pre-PR Security Gate & Phase Gate (Orchestrator):**
   - Merge `wt/backend` -> `wt/frontend` -> `wt/testing` -> `wt/security` into `feat/phase-X-<name>`.
   - Have **Security Agent** audit the unified diff against `.agents/skills/kronos-lessons/SKILL.md` and `AGENTS.md`.
   - Run `pnpm verify` (`verify:arch`, `typecheck`, `lint`, `test`, `build`) until 0 errors.
6. **Unified PR to `main`:** Secret audit (0 leaked credentials) -> push `feat/phase-X-<name>` -> open **1 PR to `main`** for CodeRabbit.
7. **Interactive CodeRabbit Review, Lessons Distillation & Risk-Based Security Delta Audit:**
   - Follow `AGENTS.md` Section 7: summarize all CodeRabbit findings and walk through them 1-by-1 interactively with industry-standard solutions before making edits.
   - Apply approved edits and **distill recurring lessons** (1 concise line per lesson, max 250 lines total) into `.agents/skills/kronos-lessons/SKILL.md` **BEFORE** final verification and push.
   - **Risk-Based Security Delta Audit (aligned with Step 5 — Default-ON):** Mandatory for ANY post-review edit touching files **outside Markdown docs (`*.md`)** — including `src/**`, `supabase/**`, `scripts/**`, `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`, `tsconfig*.json`, and `.coderabbit.yaml` — run before `pnpm verify` and `push`. Skip re-audit **only** when post-review edits modify strictly `*.md` files.
   - Run `pnpm verify` (0 errors) -> commit all fixes + `kronos-lessons` together -> push to PR.
8. **Educational Phase Debrief:** Deliver `AGENTS.md` Section 8 (file-by-file map, authoring agent, exports -> imports -> usage, state & security flow).

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

When spawning workers in `/teamwork`, pin each worker to its Primary model automatically (and use `swarm(action="model")` to fall back cleanly without losing context if a worker hits quota):

| Role | Primary Model | Quota Fallback Chain |
| :--- | :--- | :--- |
| **Orchestrator** | `Gemini 4 Neon (Extra High / High)` | `Gemini 4 Neon (Medium)` |
| **Frontend Agent** | `Gemini 4 Neon (High)` *(use `Extra High` for flagship UI screens like Chat/Neural Canvas/PIN)* | `Gemini 4 Neon (Medium)` -> `Gemini 4 Argon (Medium)` -> `Claude Sonnet 5.5 (Medium)` |
| **Backend Agent** | `Gemini 4 Neon (High)` | `Gemini 4 Argon (Medium)` -> `Claude Sonnet 5.5 (Medium)` |
| **Testing Agent** | `Gemini 4 Hydrogen (Medium)` | `Gemini 3.8 Flash (Medium)` |
| **Security Agent** | `Claude Opus 5.5 (Medium)` | `Claude Sonnet 5.5 (Medium)` -> `Gemini 4 Neon (High)` |

## 2. Mandatory 8-Step Phase Execution Sequence (Every New Chat)

When the user starts a new chat for a phase (e.g., "Направи план за Фаза X"), run this exact sequence automatically without asking how the workflow works:

1. **Context Load:** Read `ROADMAP.md`, `.agents/skills/kronos-lessons/SKILL.md`, `.agents/skills/kronos-architecture/SKILL.md`, and `.agents/skills/next-16-cache-components/SKILL.md`.
2. **Phase Plan Artifact (NO code before approval):** Present a plan with `RequestFeedback: true` listing:
   - Scope & architectural decisions for the phase;
   - Exact **Contract-First files** to be created first (SQL migrations, DB types, Zod schemas, TypeScript interfaces, API contracts);
   - Explicit per-agent **Briefs** (`Frontend`, `Backend`, `Testing`, `Security`) listing exact owned files.
3. **Contract-First Commit & User Preview (Orchestrator):**
   - Create phase branch `feat/phase-X-<name>` from `main`.
   - Commit ONLY the shared Contract-First files, share clickable file links with the user, and fast-forward all 4 worktree branches (`wt/frontend`, `wt/backend`, `wt/testing`, `wt/security`) onto the Contract commit.
4. **Parallel Execution (4 Agents):**
   - Dispatch tasks in parallel to the 4 agents inside their owned worktree paths (inheriting the user's selected model unless specified otherwise).
   - Each agent MUST read `AGENTS.md`, `.agents/skills/kronos-lessons/SKILL.md`, and relevant `.agents/skills/*/SKILL.md` first.
5. **Unified Merge, Pre-PR Security Gate & Phase Gate (Orchestrator):**
   - Merge `wt/backend` -> `wt/frontend` -> `wt/testing` -> `wt/security` into `feat/phase-X-<name>`.
   - Have **Security Agent** audit the unified diff against `.agents/skills/kronos-lessons/SKILL.md` and `AGENTS.md`.
   - Run `pnpm verify` (`verify:arch`, `typecheck`, `lint`, `test`, `build`) until 0 errors.
6. **Unified PR to `main`:** Secret audit (0 leaked credentials) -> push `feat/phase-X-<name>` -> open **1 PR to `main`** for CodeRabbit.
7. **Interactive CodeRabbit Review & Lessons Distillation:**
   - Follow `AGENTS.md` Section 7: summarize all CodeRabbit findings and walk through them 1-by-1 interactively with industry-standard solutions before making edits.
   - After resolving findings, distill recurring lessons (1 concise line per lesson, max 250 lines total) into `.agents/skills/kronos-lessons/SKILL.md`.
8. **Educational Phase Debrief:** Deliver `AGENTS.md` Section 8 (file-by-file map, authoring agent, exports -> imports -> usage, state & security flow).

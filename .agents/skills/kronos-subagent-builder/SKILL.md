---
name: kronos-subagent-builder
description: >-
  Create, register, or modify a plug-and-play AI subagent in KRONOS using OpenRouter
  Jev Decisions (/api/alpha/decisions), LangGraph sequential/parallel orchestration,
  and the Backup Traditional Supervisor. Activate when working on jevRouter.ts,
  traditionalSupervisor.ts, or any *Agent.ts file.
---

# KRONOS Plug-and-Play Subagent Standard

KRONOS uses **OpenRouter exclusively** with a 3-tier resilient routing architecture:
1. **Tier 1 (`jevRouter.ts`)**: Calls `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-*`) with `AbortSignal.timeout(1500)` using `noul` and `choice` primitives.
2. **Tier 2 (`traditionalSupervisor.ts`)**: Automatic fallback in `catch` using classic tool-calling (`bindTools`) on OpenRouter if Jev times out or errors.
3. **Tier 3 (Graceful Degradation)**: If OpenRouter itself is unreachable, return `{ ok: false, errorCode: 'AI_UNAVAILABLE' }` so the UI displays a clean BG/EL notice while SQL search, Cloudflare R2 viewing/printing, and shopping lists remain 100% operational.

## Steps to Add a New Subagent

1. **Create the Manifest (`camelCaseAgent.ts`, max 250 lines)**:
   Place inside the owning feature's `agents/` folder (e.g. `src/features/documents/agents/archiveSearchAgent.ts`).
   Include:
   - `agentId`: unique camelCase identifier (e.g. `'archiveSearchAgent'`).
   - `department`: one of `'documents' | 'finance' | 'familyHome' | 'webShopping' | 'creativeFun'`.
   - `jevCriteria`: crisp 1–2 sentence criteria used by `jevRouter.ts` in its `choice` map.
   - `inputSchema` & `outputSchema`: strict Zod schemas (no `any`).
   - `execute(input, graphState)`: reads prior facts from `graphState.collectedFacts` (enabling sequential chains like `archiveSearchAgent` ➔ `localExplorerAgent`) and appends new structured facts.

2. **Enforce Double Zod Barrier & Loop Guard**:
   - Validate incoming parameters with `inputSchema.safeParse()`.
   - Validate any LLM/API response inside the subagent with `outputSchema.safeParse()` inside `try/catch`.
   - Respect `MAX_STEPS = 4` in the LangGraph state graph to guarantee zero infinite loops.

3. **Register in Both Routers**:
   - Add the manifest to the central subagent registry consumed by **both** `jevRouter.ts` and `traditionalSupervisor.ts` so primary and backup routing never drift out of sync.

4. **Unit Test (`<name>Agent.test.ts`)**:
   - Write Vitest tests covering happy-path Zod parsing, Jev timeout fallback to `traditionalSupervisor.ts`, and `AI_UNAVAILABLE` graceful degradation.
   - Run `pnpm verify`.

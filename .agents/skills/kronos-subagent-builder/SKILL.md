---
name: kronos-subagent-builder
description: >-
  Create, register, or modify a plug-and-play AI subagent in KRONOS using OpenRouter
  Jev Decisions (/api/alpha/decisions), LangChain + LangGraph sequential/parallel orchestration,
  Jev Zone-1 search reranking, and the Backup Traditional Supervisor. Activate when working
  on jevRouter.ts, traditionalSupervisor.ts, or any *Agent.ts file.
---

# KRONOS Plug-and-Play Subagent Standard

KRONOS uses **OpenRouter exclusively** orchestrated by **LangChain + LangGraph** (`@langchain/core`, `@langchain/langgraph`, `@langchain/openai`) with 3-tier resilience:
1. **Tier 1 (`jevRouter.ts`)**: Calls `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-*`) with `AbortSignal.timeout(1500)` using `noul`, `choice`, and `score` primitives.
2. **Tier 2 (`traditionalSupervisor.ts`)**: Automatic fallback in `catch` using classic tool-calling (`bindTools`) on OpenRouter if Jev times out or errors.
3. **Tier 3 (Graceful Degradation)**: If OpenRouter itself is unreachable, return `{ ok: false, errorCode: 'AI_UNAVAILABLE' }` so the UI shows a clean notice while manual SQL/FTS search in `/documents`, Cloudflare R2 viewing/ZIP downloads, and manual `/vault` management stay 100% operational.

## Two-Tier Chat Search with Jev Reranking

When `vaultSearchAndManageAgent.ts` searches documents via the Chat-Bot:
1. Query Supabase first (hybrid SQL + Full-Text + `pgvector`) to retrieve the relevant candidate set.
2. Sort the full candidate set newest-to-oldest for **Zone 2 (All related documents)**.
3. Pass compact metadata (`id`, `title`, `topic`, `sender`, `doc_date`, `created_at`, short summary + current date) to **Jev (`/api/alpha/decisions`)** to pick the 1–2 highest-confidence matches for **Zone 1 (Exact Top Match)**.
4. Note: Direct search inside the `/documents` page uses fast classical SQL + Full-Text + `pgvector` without calling Jev.

## Steps to Add a New Subagent

1. **Create the Manifest (`camelCaseAgent.ts`, max 250 lines)**:
   Place inside the owning feature's `agents/` folder. Include `agentId`, `department`, `jevCriteria`, strict Zod `inputSchema` & `outputSchema` (no `any`), and `execute(input, graphState)` (respecting `MAX_STEPS = 4`).
2. **Enforce Double Zod Barrier, Separate Files Default & Secret Safety**:
   - Validate inputs and LLM JSON outputs with `.safeParse()` inside `try/catch`.
   - Never merge separate documents into one PDF unless the user explicitly requests merging.
   - Never inject decrypted password values (`is_secret = true`) into vector embeddings or unredacted logs.
3. **Register & Test (`<name>Agent.test.ts`)**:
   - Register in the central registry consumed by both `jevRouter.ts` and `traditionalSupervisor.ts`, add Vitest unit tests, and run `pnpm verify`.

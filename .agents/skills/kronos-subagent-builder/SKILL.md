---
name: kronos-subagent-builder
description: >-
  Create, register, or modify a plug-and-play AI subagent in KRONOS using OpenRouter
  Jev Decisions (/api/alpha/decisions), LangChain + LangGraph sequential/parallel orchestration,
  Jev Zone-1 search reranking, and the Backup Traditional Supervisor. Activate when working
  on jevRouter.ts, traditionalSupervisor.ts, or any *Agent.ts file.
---

# KRONOS Hierarchical Supervisor & Plug-and-Play Subagent Standard

KRONOS uses a **Hierarchical LangGraph Supervisor** (`supervisorGraph.ts`) orchestrated via **OpenRouter exclusively** (`@langchain/core`, `@langchain/langgraph`, `@langchain/openai`):

1. **Level 1 — `Supervisor Agent` (`supervisorGraph.ts` + `supervisorIngestion.ts`)**:
   - Single entry and exit point for the user.
   - **Pre-Jev Ingestion**: If the user attaches a file (`attachment !== null`), the Supervisor reads/analyzes it **once** before calling `Jev` (producing `ingestedAttachment`). If `attachment === null`, ingestion is skipped in `0 ms`.
   - **Centralized Memory & Context Slicing**: Only the Supervisor owns the conversation history in `SQL DB` (`chat_sessions` / `chat_messages`). When invoking a subagent, the Supervisor passes a focused context slice: `history` (last few turns) + `previousAgentState` (the last structured snapshot returned by that same subagent in the current conversation) + `ingestedAttachment`.
2. **Level 2 — `Jev Router` (`jevRouter.ts`) with 3-Tier Resilience**:
   - **Tier 1 (`jevRouter.ts`)**: Calls `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-*`) with `AbortSignal.timeout(1500)` using the user's message **and** `ingestedAttachment` summary.
   - **Tier 2 (`traditionalSupervisor.ts`)**: Automatic fallback in `catch` on OpenRouter if Jev times out or errors.
   - **Tier 3 (`keywordClassifier.ts` & Graceful Degradation)**: If OpenRouter itself is unreachable, routes deterministically and returns `{ errorCode: 'AI_UNAVAILABLE' }` when needed while keeping SQL/FTS search, Storage, and Vault 100% operational.
3. **Level 3 — Sub-Agents & Their `Sub-Tools`**:
   - `general_chat` (`generalChatAgent.ts`): Everyday AI model (`chatFast` / DeepSeek) that understands images/files via `ingestedAttachment` and can save documents/facts to `SQL DB` + `Vector DB` (`RAG`).
   - `vault_search_and_manage` (`vaultSearchAndManageAgent.ts`): Two-Zone RAG Search (Zone 1 with Jev Reranking + Zone 2), personal facts, encrypted secrets, and `100% Hard Purge`.
   - `german_bureaucracy` (`germanBureaucracyAgent.ts`): German online portals (`Wohngeld`, `Kinderzuschlag`), PDF forms (`Antrag`), deadline extraction (`Bescheid`), and official replies (`Widerspruch`).
   - **Custom Sub-Agent Flows** (e.g. `finance_manager`, `tipster`, `deep_research`): Each subagent can orchestrate its own internal `sub-tools` and returns a strict **Standard Structured Envelope** (`AssistantTurnResult` + optional `agentStateSnapshot` inside `payload`) back to the Supervisor without polluting the Supervisor's system prompt with subagent-specific JSON schemas.

## Two-Tier Chat Search with Jev Reranking

When `vaultSearchAndManageAgent.ts` searches documents via the Chat-Bot:
1. Query Supabase first (hybrid SQL + Full-Text + `pgvector`) to retrieve the relevant candidate set.
2. Sort the full candidate set newest-to-oldest for **Zone 2 (All related documents)**.
3. Pass compact metadata (`id`, `title`, `topic`, `sender`, `doc_date`, `created_at`, short summary + current date) to **Jev (`/api/alpha/decisions`)** to pick the 1–2 highest-confidence matches for **Zone 1 (Exact Top Match)**.
4. Note: Direct search inside the `/documents` page uses fast classical SQL + Full-Text + `pgvector` without calling Jev.

## Steps to Add a New Subagent

1. **Create the Manifest (`camelCaseAgent.ts`, max 250 lines)**:
   Place inside the owning feature's `agents/` folder. Include `agentId`, `department`, `jevCriteria`, strict Zod `inputSchema` & `outputSchema` (no `any`), and `execute(input)` returning the standard envelope (`AssistantTurnResult` with `payload.agentStateSnapshot` for multi-turn memory).
2. **Enforce Double Zod Barrier, Single-Pass Ingestion, Separate Files Default & Secret Safety**:
   - Validate inputs and LLM JSON outputs with `.safeParse()` inside `try/catch`.
   - Consume `input.ingestedAttachment` instead of re-running Vision OCR inside the subagent.
   - Never merge separate documents into one PDF unless the user explicitly requests merging.
   - Never inject decrypted password values (`is_secret = true`) into vector embeddings or unredacted logs.
3. **Register & Test (`<name>Agent.test.ts`)**:
   - Register in `SUBAGENT_REGISTRY` (`supervisorGraph.ts`), consumed by `jevRouter.ts` and `traditionalSupervisor.ts`, add Vitest unit tests, and run `pnpm verify`.

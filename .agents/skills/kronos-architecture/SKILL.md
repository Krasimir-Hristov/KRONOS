---
name: kronos-architecture
description: Core architectural guide for KRONOS v2 — Plug-and-Play LangGraph Departments, Namespaced pgvector RAG Collections, Dual-Door Feature Modules (index.ts/server.ts), UI-Only AES-256-GCM Secret Reveal, and 4-Worktree Contract-First workflow. Load BEFORE creating any new feature, department, DAL, or UI primitive in KRONOS.
---

# KRONOS v2 Architecture Skill

## 1. Dual-Door Feature Module Layout

Every feature lives in `src/features/<featureName>/` (`camelCase` folder name):

```text
src/features/<featureName>/
├── components/      # PascalCase.tsx — pure React 19 Arrow Function components (<= 300 lines)
├── hooks/           # use*.ts — client state & data-fetching hooks
├── schemas/         # *Schema.ts — Zod input/output validation contracts & z.infer types
├── dal/             # *Dal.ts — database/storage/external API access (MUST start with `import 'server-only';`)
├── utils/           # camelCase.ts — pure deterministic helpers
├── index.ts         # Public CLIENT-SAFE named exports ONLY (NO `export *`, NO `./dal`, NO `server-only`)
└── server.ts        # Public SERVER-ONLY exports (DAL, LangGraph nodes, server helpers)
```

### Boundary Rules
- External callers MUST import ONLY from `@/features/<featureName>` (client) or `@/features/<featureName>/server` (server).
- Shared reusable UI primitives (`ConfirmDialog`, `StatusBanner`, `CopyButton`, `Button`, `Modal`) belong in `src/components/ui/`.
- Every destructive action (delete document, memory, secret, chat) MUST use the shared `ConfirmDialog` component.

## 2. Plug-and-Play Department Contract

Every AI department lives in `src/features/departments/<departmentName>/` and implements:

```ts
export interface DepartmentDefinition {
  readonly id: string; // Matches RBAC `user_tool_permissions.department_id`
  readonly displayNameKey: string; // next-intl message key
  readonly routingDescription: string; // Description used by Jev / fallback router
  readonly allowedCollections: readonly string[]; // Principle of Least Privilege (e.g., ['personal_docs'])
  readonly supportsHitl: boolean; // Whether subgraph uses LangGraph interrupt()
}
```

- The Supervisor (Jev + LangGraph) NEVER reads `document_chunks` directly.
- Each department receives a **Scoped Retriever** locked to `allowedCollections` + authenticated `owner_id`.
- Before executing any department, the Supervisor validates `user_tool_permissions` for the current user (`admin` has full access; `member` only explicitly granted departments).

## 3. OpenRouter Model Fallback & Graceful Degradation

- Never hardcode model slugs in features. Always read from `src/config/aiModelsConfig.ts`.
- Every tier (`router`, `chatFast`, `visionOcr`, `stt`, `tts`, `embedding`) defines `primary` + `fallback`.
- All external AI calls run inside `try/catch` with `schema.safeParse()`.
- On OpenRouter outage, return a typed `OpenRouterUnavailableError` so the UI displays a clear `StatusBanner` while all non-AI features (`/documents` SQL search, preview, download, `/vault`, `/memory`) keep working 100%.

## 4. Security Non-Negotiables

- **Passwords (`vault_items`, `is_secret = true`):** Encrypted via `AES-256-GCM` (unique random IV + Auth Tag). NEVER plaintext in DB, NEVER embedded in `pgvector`, NEVER sent to OpenRouter/LLM. Revealed strictly server -> UI after Step-Up PIN.
- **Data Retention:** `documents`, `document_chunks`, and `user_memories` are permanent (until explicit Hard Purge). `chat_sessions` / `chat_messages` retained for 1 year (365 days).
- **Perimeter:** `src/proxy.ts` with CVE-2025-29927 allowlist scrubbing + `requireAuthAndPin()` in every protected DAL and Route Handler.
- **Next.js 16 `cacheComponents: true`:** Wrap all `cookies()`, `headers()`, `searchParams`, and session reads in `<Suspense>`. Never use `export const dynamic` or top-level session `await` in `layout.tsx`.

## 5. Verification Command

Run `pnpm verify` before finishing any task or PR:
`pnpm verify:arch && pnpm typecheck && pnpm lint && pnpm test && pnpm build`

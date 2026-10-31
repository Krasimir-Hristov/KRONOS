---
name: kronos-db-migration
description: >-
  Design, update, and migrate the KRONOS PostgreSQL + pgvector database schema using
  pure Supabase SQL migrations, Supabase MCP, and @supabase/supabase-js. Activate when
  creating or modifying tables, indexes, pgvector embeddings, Full-Text Search,
  vault_items encryption columns, Row-Level Security (RLS), or cron jobs.
---

# KRONOS Database & Supabase Migration Runbook

KRONOS uses **pure Supabase SQL migrations** (`supabase/migrations/*.sql`) and **Supabase MCP** (`apply_migration` + `generate_typescript_types`) with `@supabase/supabase-js` and `@supabase/ssr` — **no Drizzle ORM and no Prisma ORM**.

## Core Schema Rules

1. **Generated Types as Single Source of Truth**:
   - Store SQL migrations cleanly in `supabase/migrations/`.
   - After any schema change, run Supabase MCP `generate_typescript_types` and write the output to `src/types/databaseTypes.ts` (never use `any`).

2. **Vector Search (`pgvector`)**:
   - Enable extension `vector` in Supabase.
   - Use `vector(1536)` matching `openai/text-embedding-3-small` in `src/config/aiModelsConfig.ts`.
   - Create an **HNSW index** (`USING hnsw (embedding vector_cosine_ops)`) so vector queries stay fast and accurate at any scale.

3. **Two-Tier Smart Search & Multi-Script FTS (DE / BG / EL)**:
   - Documents combine **German** (`Kinderzuschlag`, `Wohngeld`, `Kontoauszug`, IBANs), **Bulgarian**, and **Greek**.
   - Maintain both `doc_date` (date printed on the document) and `created_at` (upload timestamp) with B-Tree indexes, plus `expires_at` index.
   - Enable `pg_trgm` and add a `GIN` Full-Text index using `'simple'` configuration plus trigram indexes on `title`, `topic`, and `sender`.

4. **Vault Facts, Encrypted Secrets & Hard Purge Everywhere**:
   - In `vault_items`, preserve `source_document_id` (`REFERENCES public.documents(id) ON DELETE SET NULL`) so extracted facts like `Steuer-ID` link directly to their source document when uploaded, or stay `null` when provided directly without a document.
   - Passwords and secrets (`is_secret = true`) MUST store ciphertext in `value_encrypted` (`AES-256-GCM`) with `value_plain = NULL`, and MUST NEVER be embedded into vector columns.
   - Deleting a document MUST physically delete both the **Cloudflare R2** object and the **Supabase** row + vectors (`Hard Purge Everywhere`).
   - Enable Row-Level Security (RLS) on **every** public table immediately upon creation.

## Migration & Verification Steps

1. Write and review the `.sql` migration file in `supabase/migrations/`.
2. Apply via Supabase MCP (`apply_migration`), regenerate `src/types/databaseTypes.ts` via `generate_typescript_types`, and run Supabase MCP `get_advisors` (`security` + `performance`).
3. Run `pnpm verify` to confirm zero TypeScript, ESLint, test, or build errors.

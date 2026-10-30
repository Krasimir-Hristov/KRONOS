---
name: kronos-db-migration
description: >-
  Design, update, and migrate the KRONOS PostgreSQL + pgvector database schema using
  Drizzle ORM and the Supabase MCP server. Activate when creating or modifying tables,
  indexes, pgvector embeddings, Full-Text Search, Row-Level Security (RLS), or cron jobs.
---

# KRONOS Database & Supabase Migration Runbook

KRONOS uses **Drizzle ORM** (`drizzle-kit` SQL migrations) as the Single Source of Truth for types, backed by **Supabase PostgreSQL**.

## Core Schema Rules

1. **File Naming & Types**:
   - Place schema files in `src/db/schema/` using `camelCase.ts` (e.g. `profilesSchema.ts`, `documentsSchema.ts`, `shoppingItemsSchema.ts`, `chatSessionsSchema.ts`).
   - Export inferred types directly: `export type DocumentRow = typeof documents.$inferSelect;` and `export type NewDocumentRow = typeof documents.$inferInsert;`.

2. **Vector Search (`pgvector`)**:
   - Enable extension `vector` in Supabase.
   - Use `vector('embedding', { dimensions: 1536 })` matching `openai/text-embedding-3-small` in `src/config/aiModelsConfig.ts`.
   - Create an **HNSW index** (`USING hnsw (embedding vector_cosine_ops)`) rather than IVFFlat so vector queries stay fast and accurate from row 1 upward.

3. **Multi-Script Full-Text & Exact SQL Search (DE / BG / EL)**:
   - Family documents combine **German** (`Kontoauszug`, `Antrag`, IBANs, `03/2023`), **Bulgarian**, and **Greek**.
   - Add B-Tree composite indexes on `(owner_id, doc_type, doc_year, doc_month)` and `(expires_at)` (for `archiveCleanupAgent.ts`).
   - Enable `pg_trgm` and add a `GIN` Full-Text index using the `'simple'` configuration (plus trigram index on `title` / `sender`) so exact numbers, German compounds, Cyrillic, and Greek words all match reliably.

4. **Row-Level Security (RLS) & Storage Hygiene**:
   - Enable RLS on **every** public table immediately upon creation.
   - Distinguish private per-parent tables (e.g. personal chat history) from shared family tables (documents vault, shopping list, kids profiles).
   - Whenever deleting document rows, always delete the corresponding object in **Cloudflare R2** in the DAL workflow so orphan blobs never accumulate.

## Migration & Verification Steps

1. Generate SQL migration via `pnpm db:generate` and inspect the generated `.sql` file before applying.
2. Apply migration via Supabase MCP (`apply_migration`) or `pnpm db:migrate`, then run Supabase MCP `get_advisors` (`security` + `performance`) to verify zero missing RLS policies or unindexed foreign keys.
3. Run `pnpm verify` to confirm full TypeScript & build health.

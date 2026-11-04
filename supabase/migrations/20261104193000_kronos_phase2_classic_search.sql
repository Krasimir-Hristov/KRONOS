-- ==============================================================================
-- KRONOS Phase 2 Classic Non-AI Search & Trigram Indexes Migration
-- Project: KRONOS (palvqeenplzvvfbzvumq)
-- Target: Pure PostgreSQL FTS + pg_trgm Search (0 EUR, <15ms, RLS Invoker)
-- ==============================================================================

-- 1. Additional GIN Trigram Indexes for instant filename & summary search
create index if not exists documents_summary_trgm_idx
  on public.documents using gin (summary_text extensions.gin_trgm_ops);

create index if not exists documents_filename_trgm_idx
  on public.documents using gin (original_file_name extensions.gin_trgm_ops);

-- 2. Classic Non-AI Search RPC (SECURITY INVOKER — enforces RLS strictly)
create or replace function public.search_documents_classic(
  p_query text default '',
  p_topic text default null,
  p_doc_type text default null,
  p_only_approved boolean default true,
  p_sort_by text default 'doc_date_desc',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  topic text,
  doc_type text,
  sender text,
  doc_date date,
  expires_at date,
  storage_path text,
  original_file_name text,
  mime_type text,
  file_size_bytes bigint,
  summary_text text,
  metadata jsonb,
  processing_status text,
  created_at timestamptz,
  updated_at timestamptz,
  relevance_score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as q,
      replace(
        replace(
          replace(btrim(coalesce(p_query, '')), '\', '\\'),
          '%',
          '\%'
        ),
        '_',
        '\_'
      ) as escaped_like
  )
  select
    d.id,
    d.title,
    d.topic,
    d.doc_type,
    d.sender,
    d.doc_date,
    d.expires_at,
    d.storage_path,
    d.original_file_name,
    d.mime_type,
    d.file_size_bytes,
    d.summary_text,
    d.metadata,
    d.processing_status,
    d.created_at,
    d.updated_at,
    case
      when n.q is null then 0.0::real
      else (
        coalesce(
          ts_rank(
            to_tsvector('simple', d.raw_ocr_text),
            websearch_to_tsquery('simple', n.q)
          ),
          0
        ) * 2.0
        + greatest(
          extensions.similarity(d.title, n.q),
          extensions.similarity(d.sender, n.q),
          extensions.similarity(d.topic, n.q),
          extensions.similarity(d.original_file_name, n.q)
        )
      )::real
    end as relevance_score
  from public.documents d
  cross join normalized n
  where d.owner_id = (select auth.uid())
    and (
      not p_only_approved
      or coalesce(d.metadata->>'pendingReview', 'false') <> 'true'
    )
    and (p_topic is null or p_topic = '' or d.topic = p_topic)
    and (p_doc_type is null or p_doc_type = '' or d.doc_type = p_doc_type)
    and (
      n.q is null
      or to_tsvector('simple', d.raw_ocr_text) @@ websearch_to_tsquery('simple', n.q)
      or d.title ilike '%' || n.escaped_like || '%' escape '\'
      or d.sender ilike '%' || n.escaped_like || '%' escape '\'
      or d.topic ilike '%' || n.escaped_like || '%' escape '\'
      or d.summary_text ilike '%' || n.escaped_like || '%' escape '\'
      or d.original_file_name ilike '%' || n.escaped_like || '%' escape '\'
      or extensions.similarity(d.title, n.q) > 0.25
      or extensions.similarity(d.sender, n.q) > 0.25
    )
  order by
    case when p_sort_by = 'relevance' and n.q is not null then 0 else 1 end asc,
    case when p_sort_by = 'relevance' and n.q is not null then
      coalesce(
        ts_rank(
          to_tsvector('simple', d.raw_ocr_text),
          websearch_to_tsquery('simple', n.q)
        ),
        0
      ) * 2.0 + extensions.similarity(d.title, n.q)
    end desc nulls last,
    case when p_sort_by = 'doc_date_desc' then d.doc_date end desc nulls last,
    case when p_sort_by = 'doc_date_asc' then d.doc_date end asc nulls last,
    case when p_sort_by = 'created_at_asc' then d.created_at end asc,
    d.created_at desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.search_documents_classic(text, text, text, boolean, text, integer, integer) from public, anon;
grant execute on function public.search_documents_classic(text, text, text, boolean, text, integer, integer) to authenticated;

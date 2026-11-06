-- ==============================================================================
-- KRONOS Phase 3: Hybrid RAG Search for the Main AI Bot (Jev Zone 1 + Zone 2)
-- Project: KRONOS (palvqeenplzvvfbzvumq)
-- Target: pgvector(1536) cosine + multi-script FTS (DE/BG/EL) + pg_trgm + date range
--         SECURITY INVOKER (RLS enforced), graceful when embedding is NULL
-- ==============================================================================

create or replace function public.search_documents_hybrid(
  p_query text default '',
  p_query_embedding extensions.vector(1536) default null,
  p_topic text default null,
  p_doc_type text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit integer default 40
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
  ),
  scored as (
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
        when p_query_embedding is not null and d.embedding is not null
          then 1 - (d.embedding operator(extensions.<=>) p_query_embedding)
        else null
      end as vec_sim,
      case
        when n.q is null then 0::real
        else coalesce(
          ts_rank(
            to_tsvector('simple', d.raw_ocr_text),
            websearch_to_tsquery('simple', n.q)
          ),
          0
        )::real
      end as fts_rank,
      case
        when n.q is null then 0::real
        else greatest(
          extensions.similarity(d.title, n.q),
          extensions.similarity(d.sender, n.q),
          extensions.similarity(d.topic, n.q),
          extensions.similarity(d.original_file_name, n.q),
          extensions.similarity(d.summary_text, n.q)
        )
      end as trgm_sim,
      (
        n.q is not null
        and (
          to_tsvector('simple', d.raw_ocr_text) @@ websearch_to_tsquery('simple', n.q)
          or d.title ilike '%' || n.escaped_like || '%' escape '\'
          or d.sender ilike '%' || n.escaped_like || '%' escape '\'
          or d.topic ilike '%' || n.escaped_like || '%' escape '\'
          or d.summary_text ilike '%' || n.escaped_like || '%' escape '\'
          or d.original_file_name ilike '%' || n.escaped_like || '%' escape '\'
        )
      ) as text_hit,
      n.q as q
    from public.documents d
    cross join normalized n
    where d.owner_id = (select auth.uid())
      and coalesce(d.metadata->>'pendingReview', 'false') <> 'true'
      and (p_topic is null or p_topic = '' or d.topic = p_topic)
      and (p_doc_type is null or p_doc_type = '' or d.doc_type = p_doc_type)
      and (
        (
          d.doc_date is not null
          and d.doc_date >= coalesce(p_date_from, '-infinity'::date)
          and d.doc_date <= coalesce(p_date_to, 'infinity'::date)
        )
        or (
          (d.created_at at time zone 'UTC')::date >= coalesce(p_date_from, '-infinity'::date)
          and (d.created_at at time zone 'UTC')::date <= coalesce(p_date_to, 'infinity'::date)
        )
      )
  )
  select
    s.id,
    s.title,
    s.topic,
    s.doc_type,
    s.sender,
    s.doc_date,
    s.expires_at,
    s.storage_path,
    s.original_file_name,
    s.mime_type,
    s.file_size_bytes,
    s.summary_text,
    s.metadata,
    s.processing_status,
    s.created_at,
    s.updated_at,
    (
      coalesce(s.vec_sim, 0) * 3.0
      + s.fts_rank * 2.0
      + s.trgm_sim
      + case when s.text_hit then 0.5 else 0.0 end
    )::real as relevance_score
  from scored s
  where s.q is null
    or s.text_hit
    or s.trgm_sim > 0.25
    or coalesce(s.vec_sim, 0) >= 0.3
  order by
    relevance_score desc,
    coalesce(s.doc_date, (s.created_at at time zone 'UTC')::date) desc,
    s.created_at desc
  limit least(greatest(p_limit, 1), 60);
$$;

revoke all on function public.search_documents_hybrid(text, extensions.vector, text, text, date, date, integer) from public, anon;
grant execute on function public.search_documents_hybrid(text, extensions.vector, text, text, date, date, integer) to authenticated;

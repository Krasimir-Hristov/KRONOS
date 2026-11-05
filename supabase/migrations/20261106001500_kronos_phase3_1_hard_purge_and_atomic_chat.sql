-- ==============================================================================
-- KRONOS Phase 3.1: Dual-Date Hybrid Filter, Atomic Chat Append & Hard Purge Scrubbing
-- Project: KRONOS (palvqeenplzvvfbzvumq)
-- Target:
--   1. Independent doc_date OR UTC created_at range filtering in search_documents_hybrid
--   2. Owner-scoped UPDATE RLS policy on chat_messages
--   3. Atomic append_chat_message RPC (inserts message + updates session updated_at)
--   4. Hard Purge RPCs scrubbing deleted facts and documents from chat_messages
-- ==============================================================================

-- 1. Update search_documents_hybrid so date bounds match either doc_date OR UTC created_at
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

-- 2. Owner-scoped UPDATE RLS policy on public.chat_messages (enables SECURITY INVOKER Hard Purge scrubbing)
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_update'
  ) then
    create policy chat_messages_update on public.chat_messages
      for update to authenticated
      using (
        exists (
          select 1 from public.chat_sessions
          where chat_sessions.id = chat_messages.session_id
            and chat_sessions.owner_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.chat_sessions
          where chat_sessions.id = chat_messages.session_id
            and chat_sessions.owner_id = (select auth.uid())
        )
      );
  end if;
end
$$;

-- 3. Atomic append_chat_message RPC (message insert + session updated_at in a single transaction)
create or replace function public.append_chat_message(
  p_session_id uuid,
  p_sender_role text,
  p_content text,
  p_metadata jsonb default '{}'::jsonb,
  p_zone1_document_ids uuid[] default '{}'::uuid[],
  p_zone2_document_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_updated_session uuid;
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.chat_sessions cs
  set updated_at = clock_timestamp()
  where cs.id = p_session_id
    and cs.owner_id = v_user_id
  returning cs.id into v_updated_session;

  if v_updated_session is null then
    raise exception 'CHAT_SESSION_NOT_FOUND';
  end if;

  insert into public.chat_messages (
    session_id,
    sender_role,
    content,
    metadata,
    zone1_document_ids,
    zone2_document_ids
  ) values (
    p_session_id,
    p_sender_role,
    p_content,
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_zone1_document_ids, '{}'::uuid[]),
    coalesce(p_zone2_document_ids, '{}'::uuid[])
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.append_chat_message(uuid, text, text, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.append_chat_message(uuid, text, text, jsonb, uuid[], uuid[]) to authenticated;

-- 4. Scrub Purged Fact Cards & Delete Prompts from chat_messages metadata
create or replace function public.scrub_purged_facts_from_chat(
  p_fact_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_fact_id_texts text[];
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_fact_ids is null or coalesce(pg_catalog.array_length(p_fact_ids, 1), 0) = 0 then
    return;
  end if;

  v_fact_id_texts := array(select u::text from pg_catalog.unnest(p_fact_ids) as u);

  update public.chat_messages cm
  set metadata = pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      cm.metadata,
      '{facts}',
      case
        when pg_catalog.jsonb_typeof(cm.metadata->'facts') = 'array' then
          coalesce(
            (
              select pg_catalog.jsonb_agg(f.elem order by f.ord)
              from pg_catalog.jsonb_array_elements(cm.metadata->'facts') with ordinality as f(elem, ord)
              where not ((f.elem->>'id') = any(v_fact_id_texts))
            ),
            '[]'::jsonb
          )
        else '[]'::jsonb
      end,
      true
    ),
    '{actions}',
    case
      when pg_catalog.jsonb_typeof(cm.metadata->'actions') = 'array' then
        coalesce(
          (
            select pg_catalog.jsonb_agg(sub.cleaned_action order by sub.ord)
            from (
              select
                a.ord,
                case
                  when a.elem->>'kind' = 'confirm_delete'
                    and a.elem->>'target' = 'facts'
                    and pg_catalog.jsonb_typeof(a.elem->'ids') = 'array'
                  then (
                    with kept as (
                      select
                        i.val as id_val,
                        coalesce(l.val, '') as label_val,
                        i.idx
                      from pg_catalog.jsonb_array_elements_text(a.elem->'ids') with ordinality as i(val, idx)
                      left join pg_catalog.jsonb_array_elements_text(
                        case
                          when pg_catalog.jsonb_typeof(a.elem->'labels') = 'array' then a.elem->'labels'
                          else '[]'::jsonb
                        end
                      ) with ordinality as l(val, idx) on l.idx = i.idx
                      where not (i.val = any(v_fact_id_texts))
                      order by i.idx
                    )
                    select
                      case
                        when (select count(*) from kept) = 0 then null::jsonb
                        else pg_catalog.jsonb_set(
                          pg_catalog.jsonb_set(
                            a.elem,
                            '{ids}',
                            (select pg_catalog.jsonb_agg(id_val order by idx) from kept),
                            true
                          ),
                          '{labels}',
                          (select pg_catalog.jsonb_agg(label_val order by idx) from kept),
                          true
                        )
                      end
                  )
                  else a.elem
                end as cleaned_action
              from pg_catalog.jsonb_array_elements(cm.metadata->'actions') with ordinality as a(elem, ord)
            ) sub
            where sub.cleaned_action is not null
          ),
          '[]'::jsonb
        )
      else '[]'::jsonb
    end,
    true
  )
  from public.chat_sessions cs
  where cs.id = cm.session_id
    and cs.owner_id = v_user_id
    and pg_catalog.jsonb_typeof(cm.metadata) = 'object'
    and (
      exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(cm.metadata->'facts') = 'array' then cm.metadata->'facts'
            else '[]'::jsonb
          end
        ) as f(elem)
        where (f.elem->>'id') = any(v_fact_id_texts)
      )
      or exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(cm.metadata->'actions') = 'array' then cm.metadata->'actions'
            else '[]'::jsonb
          end
        ) as a(elem)
        where a.elem->>'kind' = 'confirm_delete'
          and a.elem->>'target' = 'facts'
          and exists (
            select 1
            from pg_catalog.jsonb_array_elements_text(
              case
                when pg_catalog.jsonb_typeof(a.elem->'ids') = 'array' then a.elem->'ids'
                else '[]'::jsonb
              end
            ) as i(val)
            where i.val = any(v_fact_id_texts)
          )
      )
    );
end;
$$;

revoke all on function public.scrub_purged_facts_from_chat(uuid[]) from public, anon;
grant execute on function public.scrub_purged_facts_from_chat(uuid[]) to authenticated;

-- 5. Scrub Purged Document IDs from chat_messages (zone1, zone2, portalDocumentIds, sourceDocumentId, actions)
create or replace function public.scrub_purged_documents_from_chat(
  p_document_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_doc_id_texts text[];
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_document_ids is null or coalesce(pg_catalog.array_length(p_document_ids, 1), 0) = 0 then
    return;
  end if;

  v_doc_id_texts := array(select u::text from pg_catalog.unnest(p_document_ids) as u);

  update public.chat_messages cm
  set
    zone1_document_ids = coalesce(
      array(
        select t.u
        from pg_catalog.unnest(cm.zone1_document_ids) with ordinality as t(u, ord)
        where not (t.u = any(p_document_ids))
        order by t.ord
      ),
      '{}'::uuid[]
    ),
    zone2_document_ids = coalesce(
      array(
        select t.u
        from pg_catalog.unnest(cm.zone2_document_ids) with ordinality as t(u, ord)
        where not (t.u = any(p_document_ids))
        order by t.ord
      ),
      '{}'::uuid[]
    ),
    metadata = case
      when pg_catalog.jsonb_typeof(cm.metadata) <> 'object' then cm.metadata
      else pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(
          pg_catalog.jsonb_set(
            cm.metadata,
            '{portalDocumentIds}',
            case
              when pg_catalog.jsonb_typeof(cm.metadata->'portalDocumentIds') = 'array' then
                coalesce(
                  (
                    select pg_catalog.jsonb_agg(p.elem order by p.ord)
                    from pg_catalog.jsonb_array_elements(cm.metadata->'portalDocumentIds') with ordinality as p(elem, ord)
                    where not ((p.elem #>> '{}') = any(v_doc_id_texts))
                  ),
                  '[]'::jsonb
                )
              else '[]'::jsonb
            end,
            true
          ),
          '{facts}',
          case
            when pg_catalog.jsonb_typeof(cm.metadata->'facts') = 'array' then
              coalesce(
                (
                  select pg_catalog.jsonb_agg(
                    case
                      when (f.elem->>'sourceDocumentId') = any(v_doc_id_texts) then
                        f.elem || '{"sourceDocumentId":null,"sourceDocumentTitle":null,"sourceDocumentDate":null}'::jsonb
                      else f.elem
                    end
                    order by f.ord
                  )
                  from pg_catalog.jsonb_array_elements(cm.metadata->'facts') with ordinality as f(elem, ord)
                ),
                '[]'::jsonb
              )
            else '[]'::jsonb
          end,
          true
        ),
        '{actions}',
        case
          when pg_catalog.jsonb_typeof(cm.metadata->'actions') = 'array' then
            coalesce(
              (
                select pg_catalog.jsonb_agg(sub.cleaned_action order by sub.ord)
                from (
                  select
                    a.ord,
                    case
                      when a.elem->>'kind' = 'notice'
                        and (a.elem->>'documentId') = any(v_doc_id_texts)
                      then pg_catalog.jsonb_set(a.elem, '{documentId}', 'null'::jsonb, true)
                      when a.elem->>'kind' = 'confirm_delete'
                        and a.elem->>'target' = 'documents'
                        and pg_catalog.jsonb_typeof(a.elem->'ids') = 'array'
                      then (
                        with kept as (
                          select
                            i.val as id_val,
                            coalesce(l.val, '') as label_val,
                            i.idx
                          from pg_catalog.jsonb_array_elements_text(a.elem->'ids') with ordinality as i(val, idx)
                          left join pg_catalog.jsonb_array_elements_text(
                            case
                              when pg_catalog.jsonb_typeof(a.elem->'labels') = 'array' then a.elem->'labels'
                              else '[]'::jsonb
                            end
                          ) with ordinality as l(val, idx) on l.idx = i.idx
                          where not (i.val = any(v_doc_id_texts))
                          order by i.idx
                        )
                        select
                          case
                            when (select count(*) from kept) = 0 then null::jsonb
                            else pg_catalog.jsonb_set(
                              pg_catalog.jsonb_set(
                                a.elem,
                                '{ids}',
                                (select pg_catalog.jsonb_agg(id_val order by idx) from kept),
                                true
                              ),
                              '{labels}',
                              (select pg_catalog.jsonb_agg(label_val order by idx) from kept),
                              true
                            )
                          end
                      )
                      else a.elem
                    end as cleaned_action
                  from pg_catalog.jsonb_array_elements(cm.metadata->'actions') with ordinality as a(elem, ord)
                ) sub
                where sub.cleaned_action is not null
              ),
              '[]'::jsonb
            )
          else '[]'::jsonb
        end,
        true
      )
    end
  from public.chat_sessions cs
  where cs.id = cm.session_id
    and cs.owner_id = v_user_id
    and (
      cm.zone1_document_ids && p_document_ids
      or cm.zone2_document_ids && p_document_ids
      or (
        pg_catalog.jsonb_typeof(cm.metadata) = 'object'
        and (
          exists (
            select 1
            from pg_catalog.jsonb_array_elements(
              case
                when pg_catalog.jsonb_typeof(cm.metadata->'portalDocumentIds') = 'array'
                  then cm.metadata->'portalDocumentIds'
                else '[]'::jsonb
              end
            ) as p(elem)
            where (p.elem #>> '{}') = any(v_doc_id_texts)
          )
          or exists (
            select 1
            from pg_catalog.jsonb_array_elements(
              case
                when pg_catalog.jsonb_typeof(cm.metadata->'facts') = 'array'
                  then cm.metadata->'facts'
                else '[]'::jsonb
              end
            ) as f(elem)
            where (f.elem->>'sourceDocumentId') = any(v_doc_id_texts)
          )
          or exists (
            select 1
            from pg_catalog.jsonb_array_elements(
              case
                when pg_catalog.jsonb_typeof(cm.metadata->'actions') = 'array'
                  then cm.metadata->'actions'
                else '[]'::jsonb
              end
            ) as a(elem)
            where (a.elem->>'documentId') = any(v_doc_id_texts)
              or (
                a.elem->>'kind' = 'confirm_delete'
                and a.elem->>'target' = 'documents'
                and exists (
                  select 1
                  from pg_catalog.jsonb_array_elements_text(
                    case
                      when pg_catalog.jsonb_typeof(a.elem->'ids') = 'array' then a.elem->'ids'
                      else '[]'::jsonb
                    end
                  ) as i(val)
                  where i.val = any(v_doc_id_texts)
                )
              )
          )
        )
      )
    );
end;
$$;

revoke all on function public.scrub_purged_documents_from_chat(uuid[]) from public, anon;
grant execute on function public.scrub_purged_documents_from_chat(uuid[]) to authenticated;

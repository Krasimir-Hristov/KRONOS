-- ==============================================================================
-- KRONOS Phase 2.1: Per-Owner Serialized Fact Deduplication RPC
-- Project: KRONOS (palvqeenplzvvfbzvumq)
-- Target: Race-free concurrent fact deduplication with pg_advisory_xact_lock
-- ==============================================================================

create or replace function public.save_deduplicated_vault_facts(
  p_source_document_id uuid,
  p_candidates jsonb default '[]'::jsonb
)
returns table (
  inserted_count integer,
  skipped_duplicates integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item jsonb;
  v_label text;
  v_value text;
  v_category text;
  v_hint text;
  v_compact text;
  v_lower_label text;
  v_norm_val text;
  v_cand_key text;
  v_existing_id uuid;
  v_existing_source_doc uuid;
  v_inserted integer := 0;
  v_skipped integer := 0;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  -- Serialize concurrent fact approvals per owner (transaction-scoped, pooler-safe)
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('kronos_vault_dedup:' || v_user_id::text, 0)
  );

  if not exists (
    select 1
    from public.documents d
    where d.id = p_source_document_id
      and d.owner_id = v_user_id
  ) then
    raise exception 'DOCUMENT_NOT_OWNED';
  end if;

  if p_candidates is null or pg_catalog.jsonb_typeof(p_candidates) <> 'array' then
    return query select 0, 0;
    return;
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_candidates)
  loop
    v_label := pg_catalog.btrim(coalesce(v_item->>'label', ''));
    v_value := pg_catalog.btrim(coalesce(v_item->>'value', ''));
    v_category := coalesce(nullif(pg_catalog.btrim(v_item->>'category'), ''), 'other');
    v_hint := nullif(pg_catalog.btrim(coalesce(v_item->>'hint', '')), '');

    if v_label = '' or v_value = '' then
      continue;
    end if;

    v_compact := pg_catalog.upper(pg_catalog.regexp_replace(v_value, '[\s\-./]+', '', 'g'));
    v_lower_label := pg_catalog.lower(pg_catalog.regexp_replace(v_label, '\s+', ' ', 'g'));
    v_norm_val := pg_catalog.lower(pg_catalog.regexp_replace(v_value, '\s+', ' ', 'g'));

    if v_compact ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
      v_cand_key := 'id:iban:' || v_compact;
    elsif v_compact ~ '^[0-9]{3}FK[0-9]{6}$' then
      v_cand_key := 'id:kg:' || v_compact;
    elsif v_compact ~ '^[0-9]{11}$'
      and (v_lower_label like '%steuer%' or v_lower_label like '%данъч%' or v_lower_label like '%idnr%') then
      v_cand_key := 'id:steuer:' || v_compact;
    else
      v_cand_key := 'pair:' || v_lower_label || '||' || v_norm_val;
    end if;

    v_existing_id := null;
    v_existing_source_doc := null;

    select
      vi.id,
      vi.source_document_id
    into
      v_existing_id,
      v_existing_source_doc
    from public.vault_items vi
    where vi.owner_id = v_user_id
      and vi.is_secret = false
      and (
        case
          when pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g')) ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'
            then 'id:iban:' || pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g'))
          when pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g')) ~ '^[0-9]{3}FK[0-9]{6}$'
            then 'id:kg:' || pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g'))
          when pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g')) ~ '^[0-9]{11}$'
            and (
              pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(vi.label), '\s+', ' ', 'g')) like '%steuer%'
              or pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(vi.label), '\s+', ' ', 'g')) like '%данъч%'
              or pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(vi.label), '\s+', ' ', 'g')) like '%idnr%'
            )
            then 'id:steuer:' || pg_catalog.upper(pg_catalog.regexp_replace(coalesce(vi.value_plain, ''), '[\s\-./]+', '', 'g'))
          else
            'pair:'
            || pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(vi.label), '\s+', ' ', 'g'))
            || '||'
            || pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(vi.value_plain, '')), '\s+', ' ', 'g'))
        end
      ) = v_cand_key
    order by vi.updated_at desc
    limit 1;

    if v_existing_id is not null then
      v_skipped := v_skipped + 1;
      if v_existing_source_doc is null then
        update public.vault_items
        set source_document_id = p_source_document_id
        where id = v_existing_id
          and owner_id = v_user_id;
      end if;
    else
      insert into public.vault_items (
        owner_id,
        category,
        label,
        value_plain,
        value_encrypted,
        is_secret,
        username_or_hint,
        source_document_id
      ) values (
        v_user_id,
        v_category,
        v_label,
        v_value,
        null,
        false,
        v_hint,
        p_source_document_id
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return query select v_inserted, v_skipped;
end;
$$;

revoke all on function public.save_deduplicated_vault_facts(uuid, jsonb) from public, anon;
grant execute on function public.save_deduplicated_vault_facts(uuid, jsonb) to authenticated;

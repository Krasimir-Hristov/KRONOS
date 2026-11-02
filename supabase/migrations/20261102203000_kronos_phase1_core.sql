-- ==============================================================================
-- KRONOS Phase 1 Core Database & Storage Migration
-- Project: KRONOS (palvqeenplzvvfbzvumq)
-- Target: PostgreSQL 17 + pgvector(1536) + Private Storage (kronos-vault, 50MB)
-- ==============================================================================

-- 1. EXTENSIONS (Installed in schema extensions)
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- 2. PRIVATE SCHEMA & SECURITY DEFINER HELPERS
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated, service_role;

-- 3. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  preferred_locale text not null default 'bg',
  pin_hash text,
  pin_failed_attempts integer not null default 0 check (pin_failed_attempts >= 0 and pin_failed_attempts <= 10),
  pin_locked_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- 4. DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  topic text not null default 'allgemein',
  doc_type text not null default 'sonstiges',
  sender text not null default '',
  doc_date date,
  expires_at date,
  storage_path text not null unique,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  raw_ocr_text text not null default '',
  summary_text text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists documents_owner_id_idx on public.documents (owner_id);
create index if not exists documents_owner_doc_date_idx on public.documents (owner_id, doc_date desc nulls last, created_at desc);
create index if not exists documents_owner_created_at_idx on public.documents (owner_id, created_at desc);
create index if not exists documents_owner_expires_at_idx on public.documents (owner_id, expires_at) where expires_at is not null;
create index if not exists documents_ocr_fts_idx on public.documents using gin (to_tsvector('simple', raw_ocr_text));
create index if not exists documents_title_trgm_idx on public.documents using gin (title extensions.gin_trgm_ops);
create index if not exists documents_topic_trgm_idx on public.documents using gin (topic extensions.gin_trgm_ops);
create index if not exists documents_sender_trgm_idx on public.documents using gin (sender extensions.gin_trgm_ops);
create index if not exists documents_embedding_hnsw_idx on public.documents using hnsw (embedding extensions.vector_cosine_ops);

alter table public.documents enable row level security;

create policy documents_select on public.documents
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy documents_insert on public.documents
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy documents_update on public.documents
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy documents_delete on public.documents
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function private.set_updated_at();

-- 5. VAULT ITEMS TABLE
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'personal',
  label text not null,
  username_or_hint text,
  is_secret boolean not null default false,
  value_plain text,
  value_encrypted text,
  source_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint vault_items_secret_value_check check (
    (is_secret = true and value_plain is null and value_encrypted is not null) or
    (is_secret = false and value_plain is not null and value_encrypted is null)
  )
);

create index if not exists vault_items_owner_id_idx on public.vault_items (owner_id);
create index if not exists vault_items_source_doc_idx on public.vault_items (source_document_id);
create index if not exists vault_items_owner_secret_category_idx on public.vault_items (owner_id, is_secret, category);

alter table public.vault_items enable row level security;

create policy vault_items_select on public.vault_items
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy vault_items_insert on public.vault_items
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy vault_items_update on public.vault_items
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy vault_items_delete on public.vault_items
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop trigger if exists set_vault_items_updated_at on public.vault_items;
create trigger set_vault_items_updated_at
  before update on public.vault_items
  for each row execute function private.set_updated_at();

-- 6. CHAT SESSIONS & MESSAGES TABLES
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Нов разговор',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists chat_sessions_owner_id_idx on public.chat_sessions (owner_id, updated_at desc);

alter table public.chat_sessions enable row level security;

create policy chat_sessions_select on public.chat_sessions
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy chat_sessions_insert on public.chat_sessions
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy chat_sessions_update on public.chat_sessions
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy chat_sessions_delete on public.chat_sessions
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop trigger if exists set_chat_sessions_updated_at on public.chat_sessions;
create trigger set_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function private.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'assistant', 'system')),
  content text not null,
  zone1_document_ids uuid[] not null default '{}'::uuid[],
  zone2_document_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id, created_at asc);

alter table public.chat_messages enable row level security;

create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.owner_id = (select auth.uid())
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.owner_id = (select auth.uid())
    )
  );

create policy chat_messages_delete on public.chat_messages
  for delete to authenticated
  using (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.owner_id = (select auth.uid())
    )
  );

-- 7. SUPABASE STORAGE BUCKET: kronos-vault (50 MB limit, private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kronos-vault',
  'kronos-vault',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS scoped strictly to folder = auth.uid()
drop policy if exists kronos_vault_select on storage.objects;
create policy kronos_vault_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kronos-vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists kronos_vault_insert on storage.objects;
create policy kronos_vault_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kronos-vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists kronos_vault_update on storage.objects;
create policy kronos_vault_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'kronos-vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'kronos-vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists kronos_vault_delete on storage.objects;
create policy kronos_vault_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kronos-vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

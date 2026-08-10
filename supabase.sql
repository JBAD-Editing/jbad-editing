-- Jbad Editing Supabase setup
-- Run this entire file in Supabase SQL Editor.
-- IMPORTANT: never put a service_role key in your website.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Jbad Editor',
  username text unique,
  speciality text,
  bio text,
  avatar_url text,
  website_url text,
  role text not null default 'editor' check (role in ('editor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editor_posts (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  created_at timestamptz not null default now()
);

create index if not exists editor_posts_editor_id_idx on public.editor_posts(editor_id);
create index if not exists editor_posts_created_at_idx on public.editor_posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.editor_posts enable row level security;

-- Public profiles and public showcase posts.
drop policy if exists "Public can view profiles" on public.profiles;
create policy "Public can view profiles"
on public.profiles for select
using (true);

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public can view posts" on public.editor_posts;
create policy "Public can view posts"
on public.editor_posts for select
using (true);

drop policy if exists "Editors create own posts" on public.editor_posts;
create policy "Editors create own posts"
on public.editor_posts for insert
to authenticated
with check (auth.uid() = editor_id);

drop policy if exists "Editors update own posts" on public.editor_posts;
create policy "Editors update own posts"
on public.editor_posts for update
to authenticated
using (auth.uid() = editor_id)
with check (auth.uid() = editor_id);

drop policy if exists "Editors delete own posts" on public.editor_posts;
create policy "Editors delete own posts"
on public.editor_posts for delete
to authenticated
using (auth.uid() = editor_id);

-- Automatically create a profile after a new auth account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, speciality)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Jbad Editor'),
    coalesce(new.raw_user_meta_data->>'speciality', 'Video & Photo Editor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Storage bucket for portfolio media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  52428800,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public viewing. Uploads are restricted to the logged-in user's folder:
-- portfolio/<user-id>/<filename>
drop policy if exists "Portfolio files are public" on storage.objects;
create policy "Portfolio files are public"
on storage.objects for select
using (bucket_id = 'portfolio');

drop policy if exists "Users upload portfolio files" on storage.objects;
create policy "Users upload portfolio files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update portfolio files" on storage.objects;
create policy "Users update portfolio files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'portfolio'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'portfolio'
  and owner_id = auth.uid()::text
);

drop policy if exists "Users delete portfolio files" on storage.objects;
create policy "Users delete portfolio files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'portfolio'
  and owner_id = auth.uid()::text
);

-- Optional: after your first account is created, make it admin manually:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';

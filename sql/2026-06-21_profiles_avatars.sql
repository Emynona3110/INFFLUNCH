-- =============================================================================
-- Profils utilisateurs + avatars (photos de profil) — 2026-06-21
-- - Bucket `avatars` (public). Fichier à NOM ALÉATOIRE dans un dossier par
--   utilisateur : "{userId}/{uuid}.webp" → URL publique NON devinable (sécurité)
--   et l'ancien fichier est supprimé à chaque changement (chemin gardé en base).
-- - Table `profiles` : ligne éditable par chaque utilisateur pour SA ligne.
--   `avatar_path` = chemin du fichier courant (null = pas de pp).
-- - RLS storage "own-folder" : chacun n'écrit / lit / supprime QUE dans son
--   dossier "{son_id}/…" (la lecture pour autrui se fait via l'URL publique).
--
-- Idempotent (migre une installation existante). À exécuter sur Supabase.
-- =============================================================================

-- 1) Bucket avatars ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Table profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  avatar_path text,                         -- null = pas de pp perso
  created_at  timestamptz not null default now()
);

-- Migration depuis l'ancienne version (avatar_updated_at → avatar_path).
alter table public.profiles drop column if exists avatar_updated_at;
alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles enable row level security;

drop policy if exists "profiles select authenticated" on public.profiles;
create policy "profiles select authenticated"
on public.profiles for select to authenticated
using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3) RLS storage.objects pour le bucket avatars (own-folder) -------------------
-- Bucket public → lecture des images via URL publique (pas de policy SELECT
-- nécessaire pour AFFICHER). La policy SELECT ci-dessous est limitée au dossier
-- de l'utilisateur : elle sert uniquement à ce que `remove` retrouve SES anciens
-- fichiers (pas de listing global → pas d'avertissement Supabase).

-- Nettoyage des variantes précédentes.
drop policy if exists "avatars write authenticated"  on storage.objects;
drop policy if exists "avatars update authenticated" on storage.objects;
drop policy if exists "avatars delete authenticated" on storage.objects;
drop policy if exists "avatars read authenticated"   on storage.objects;
drop policy if exists "avatars read own"             on storage.objects;
drop policy if exists "avatars insert own"           on storage.objects;
drop policy if exists "avatars update own"           on storage.objects;
drop policy if exists "avatars delete own"           on storage.objects;

create policy "avatars insert own"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

create policy "avatars read own"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

create policy "avatars delete own"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

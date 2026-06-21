-- =============================================================================
-- Profils utilisateurs + avatars (photos de profil) — 2026-06-21
-- - Bucket `avatars` (public). Fichier nommé par l'id : "{userId}.webp",
--   écrasé à chaque changement (upsert).
-- - Table `profiles` : ligne éditable par chaque utilisateur pour SA ligne
--   (la table `users` reste admin-only). `avatar_updated_at` sert de version
--   (cache-busting via ?v=) et indique qui possède une pp personnalisée.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Bucket avatars ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Table profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  avatar_updated_at timestamptz,           -- null = pas de pp perso
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lecture par tous les authentifiés (pour afficher les avatars des auteurs d'avis).
drop policy if exists "profiles select authenticated" on public.profiles;
create policy "profiles select authenticated"
on public.profiles for select to authenticated
using (true);

-- Chacun crée / met à jour UNIQUEMENT sa propre ligne.
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3) RLS storage.objects pour le bucket avatars --------------------------------
-- Bucket public → lecture via URL publique sans policy SELECT (pas de listing).
-- Le fichier est nommé par le PRÉFIXE de l'email ("{prefixe}.webp"). On garde une
-- policy simple (bucket_id) pour les authentifiés : pas de blocage RLS. Risque
-- résiduel (un user pourrait écraser la pp d'un autre) acceptable pour un outil
-- interne (~100 collègues de confiance).

-- Lecture limitée à SA PROPRE pp (nécessaire pour que `remove` la retrouve au
-- changement). Restreinte à "{prefixe_email}.webp" → pas de listing global du
-- bucket (évite l'avertissement Supabase « clients can list all files »).
-- L'expression reproduit exactement la clé calculée côté client (avatarKey).
drop policy if exists "avatars read authenticated" on storage.objects;
drop policy if exists "avatars read own" on storage.objects;
create policy "avatars read own"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and name = regexp_replace(lower(split_part(auth.email(), '@', 1)), '[^a-z0-9._-]', '-', 'g') || '.webp'
);

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars write authenticated"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars');

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update authenticated"
on storage.objects for update to authenticated
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete authenticated"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars');

-- =============================================================================
-- Pastille « nouveautés non vues » : dernière nouveauté consultée, EN BASE
-- — 2026-09-18
-- Même mécanisme que `achievements_seen_at` (2026-09-14) : jusqu'ici en
-- localStorage, donc partagé entre comptes d'un même navigateur et vide sur un
-- autre appareil. Désormais par utilisateur, tous appareils. Upsert par le
-- client (RLS profiles insert/update own OK).
--
-- La valeur est la DATE (AAAA-MM-JJ, celle des entrées de `changelog.tsx`) de
-- la nouveauté la plus récente consultée : une entrée plus récente = non vue.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================
alter table public.profiles
  add column if not exists changelog_seen_at date;

-- État initial : tout le monde a vu toutes les nouveautés jusqu'aux « Profils
-- publics » (2026-09-14) — seules celles du 2026-09-18 (« Affichage mobile »)
-- ressortent. Un compte sans ligne `profiles` en reçoit une pour la même raison.
insert into public.profiles (id, changelog_seen_at)
select u.id, date '2026-09-14'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles
   set changelog_seen_at = date '2026-09-14'
 where changelog_seen_at is null;

-- Vérification :
--   select count(*) filter (where changelog_seen_at = '2026-09-14') as ok,
--          count(*) as total
--     from public.profiles;

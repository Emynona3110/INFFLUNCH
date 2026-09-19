-- =============================================================================
-- Pastille « une de mes demandes a été classée » : dernier classement consulté,
-- EN BASE — 2026-09-19
-- Même mécanisme que `achievements_seen_at` (2026-09-14) et
-- `changelog_seen_at` (2026-09-18) : jusqu'ici en localStorage, donc partagé
-- entre comptes d'un même navigateur et vide sur un autre appareil. Désormais
-- par utilisateur, tous appareils. Upsert par le client (RLS profiles
-- insert/update own OK).
--
-- La valeur est le `handled_at` (timestamptz) le plus récent consulté parmi
-- mes demandes : une demande classée depuis = non vue (puce sur l'onglet et
-- sur la demande elle-même).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================
alter table public.profiles
  add column if not exists feedback_seen_at timestamptz;

-- État initial : tout ce qui a été classé jusqu'ici est considéré vu (le
-- localStorage d'avant l'avait déjà acquitté sur l'appareil habituel) — pas
-- de rafale de puces à la migration. Un compte sans ligne `profiles` en reçoit
-- une pour la même raison.
insert into public.profiles (id, feedback_seen_at)
select u.id, now()
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles
   set feedback_seen_at = now()
 where feedback_seen_at is null;

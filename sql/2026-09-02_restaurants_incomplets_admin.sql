-- =============================================================================
-- Restaurants incomplets réservés aux admins — 2026-09-02
-- Un restaurant sans `distance` est un restaurant qui n'a pas encore été
-- géocodé : pas de pastille « 400m », pas de position sur la carte, et un score
-- de proximité maximal par défaut (règle « distance inconnue = 1.0 ») qui le
-- ferait remonter en tête de liste. Plutôt que de courir après l'ordre des
-- scripts d'import, on le rend simplement invisible tant qu'il est incomplet.
--
-- La règle est posée en RLS, donc elle vaut pour TOUTES les lectures d'un coup
-- (liste, recherche, carte, roulette, choix du midi, Top 5, fiche par slug) :
-- rien à filtrer côté front, et rien qui puisse être contourné depuis le client.
--
-- Les admins, eux, voient tout : c'est ce qui leur permet de compléter les
-- fiches (pin sur la carte via le crayon) ou de lancer les backfills.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

drop policy if exists "Enable read access for all users" on public.restaurants;

create policy "Restaurants complets pour tous, incomplets pour les admins"
on public.restaurants
for select
to authenticated
using (
  distance is not null
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  )
);

-- Contrôles :
--   -- ce qui est masqué aux non-admins pour le moment :
--   select name, address, lat, lng
--   from public.restaurants
--   where distance is null
--   order by name;
--
--   -- après les backfills, cette liste doit se vider (sauf les fiches sans
--   -- adresse exploitable, qui resteront à compléter à la main dans l'admin).

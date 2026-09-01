-- =============================================================================
-- Restaurant fermé + contributions verrouillées — 2026-09-01
-- Quand un restaurant ferme, on ne le supprime PAS : on garde la trace (avis,
-- photos, menus, tablées passées). Il est simplement marqué `closed` :
--   * image en noir et blanc partout dans l'appli ;
--   * plus possible d'y déclarer son déjeuner, ni de le tirer à la roue ;
--   * relégué en fin de liste (tri front : `closed` croissant avant le tri
--     choisi) et exclu du Top 3.
--
-- `contributions_enabled` est INDÉPENDANT de la fermeture : il verrouille les
-- nouveaux avis / photos / menus (le contenu existant reste visible). Un resto
-- fermé peut ainsi garder ses contributions ouvertes, et inversement.
--
-- Les écritures sur `restaurants` sont déjà admin-only (RLS existante) : rien
-- à ajouter côté policies.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

alter table public.restaurants
  add column if not exists closed boolean not null default false,
  add column if not exists contributions_enabled boolean not null default true;

-- Tri par défaut de la grille : les fermés passent derrière, quel que soit le
-- critère. L'index sert le `order by closed, relevance desc` du front.
create index if not exists restaurants_closed_relevance_idx
  on public.restaurants (closed, relevance desc);

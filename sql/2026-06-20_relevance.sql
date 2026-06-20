-- =============================================================================
-- Pertinence (relevance) — 2026-06-20
-- Calcul SERVEUR du score de tri par défaut de la grille (restaurants.relevance,
-- jusqu'ici toujours 0). Score composite 0..~100 combinant :
--   1. Qualité   = note bayésienne (corrige le faible nb d'avis)
--   2. Popularité= avis + favoris, écrasés par un log (anti-monopole)
--   3. Proximité = décroissance douce avec la distance à INFFLUX (déjeuner)
--   4. Nouveauté = bonus dégressif sur 14 j pour les restos récemment ajoutés
--
-- Le score est recalculé pour TOUS les restos à chaque changement d'avis ou de
-- favori (les composantes Qualité/Popularité dépendent de stats GLOBALES :
-- moyenne générale C et popularité max). À notre échelle (~100 users, peu de
-- restos) un recalcul global est négligeable.
--
-- Aucun changement front : le tri `order("relevance")` existant marche tel quel.
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
--
-- Paramètres ajustables : voir le bloc `declare` de recalc_relevance().
-- =============================================================================

-- 1) Fonction de calcul (appelable directement pour un backfill) ---------------
-- security definer : le calcul écrit dans restaurants (RLS admin-only) ; il
-- s'exécute donc avec les droits du propriétaire, comme recalc_restaurant_rating.
create or replace function public.recalc_relevance()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- ---- Paramètres (à ajuster) ----
  m_conf    constant real := 5;     -- seuil de confiance bayésien (nb d'avis)
  d0_km     constant real := 0.4;   -- distance de référence (0,4 km → Prox=0,5)
  w_quality constant real := 0.5;   -- poids qualité
  w_pop     constant real := 0.2;   -- poids popularité
  w_prox    constant real := 0.3;   -- poids proximité
  new_days  constant real := 14;    -- durée du bonus nouveauté (jours)
  new_boost constant real := 5;     -- bonus nouveauté max (points), à t=0
  -- ---- Stats globales (le resto "test" est exclu pour ne pas fausser) ----
  prior_c   real;   -- C : note moyenne a priori
  max_pop   real;   -- popularité (avis+favoris) max, pour normaliser le log
begin
  -- C = moyenne des notes des restos NOTÉS (reviews>0). Fallback 3.0 (neutre).
  select coalesce(avg(rating), 3.0)::real
  into prior_c
  from public.restaurants
  where reviews > 0 and slug is distinct from 'test';

  -- popularité max = max(reviews + nb favoris)
  select coalesce(max(reviews + fav), 0)::real
  into max_pop
  from public.restaurants r
  left join (
    select restaurant_id, count(*)::real as fav
    from public.favorites group by restaurant_id
  ) f on f.restaurant_id = r.id
  where r.slug is distinct from 'test';

  update public.restaurants r
  set relevance = round(s.score::numeric, 2)::real
  from (
    select
      r2.id,
      100 * (
          w_quality * (
            -- Q bayésien sur 0..5, normalisé /5
            ((r2.reviews * r2.rating + m_conf * prior_c)
              / nullif(r2.reviews + m_conf, 0)) / 5.0
          )
        + w_pop * (
            case when max_pop > 0
              then ln(1 + r2.reviews + coalesce(f.fav, 0)) / ln(1 + max_pop)
              else 0 end
          )
        + w_prox * (
            -- 0,5 (neutre) si distance inconnue, sinon 1/(1+d/d0)
            case when r2.distance is null
              then 0.5
              else 1.0 / (1.0 + r2.distance / d0_km) end
          )
      )
      -- bonus nouveauté : new_boost à la création, 0 après new_days jours
      + greatest(0,
          new_boost * (1 - extract(epoch from now() - r2.created_at)
                            / (new_days * 86400)))
      as score
    from public.restaurants r2
    left join (
      select restaurant_id, count(*)::real as fav
      from public.favorites group by restaurant_id
    ) f on f.restaurant_id = r2.id
  ) s
  where r.id = s.id;
end;
$$;

-- 2) Wrapper trigger (statement-level) ----------------------------------------
-- FOR EACH STATEMENT → s'exécute une seule fois par requête, APRÈS les triggers
-- row-level (donc après recalc_restaurant_rating qui met à jour rating/reviews).
create or replace function public.tg_recalc_relevance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_relevance();
  return null;
end;
$$;

-- 3) Branchements --------------------------------------------------------------
-- Sur les avis : rating/reviews changent → qualité & popularité changent.
drop trigger if exists trg_reviews_relevance on public.reviews;
create trigger trg_reviews_relevance
after insert or update or delete on public.reviews
for each statement execute function public.tg_recalc_relevance();

-- Sur les favoris : popularité change.
drop trigger if exists trg_favorites_relevance on public.favorites;
create trigger trg_favorites_relevance
after insert or delete on public.favorites
for each statement execute function public.tg_recalc_relevance();

-- 4) Backfill initial ----------------------------------------------------------
select public.recalc_relevance();

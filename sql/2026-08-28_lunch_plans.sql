-- =============================================================================
-- « Qui déjeune où aujourd'hui » — 2026-08-28
-- Une seule intention par personne et par jour : la clé primaire (user_id, day)
-- rend le changement de restaurant un simple upsert. Il n'y a pas de notion
-- d'organisateur ni d'invitation — les tablées émergent de l'agrégation par
-- restaurant : le premier qui déclare crée de fait le groupe, « Je viens »
-- écrit simplement la ligne du suivant.
--
-- Lecture par tous les authentifiés (voir qui va où est le principe même de la
-- fonctionnalité) ; on n'écrit et n'efface que sa propre ligne.
--
-- ⚠️ Rétention : la table n'est JAMAIS purgée et la policy select ne filtre pas
-- sur la date. L'appli n'affiche que le jour courant, mais l'historique complet
-- reste lisible via l'API par tout utilisateur connecté — choix assumé
-- (2026-08-28). Volume négligeable : ~100 personnes × ~220 jours ≈ 22 000
-- lignes/an. Pour restreindre plus tard : `using (day = ((now() at time zone
-- 'Europe/Paris')::date))` sur la policy select.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Table ---------------------------------------------------------------------
create table if not exists public.lunch_plans (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Jour du déjeuner, en heure de Paris. C'est l'AFFICHAGE qui repart de zéro
  -- à minuit (le client filtre sur le jour courant) : les lignes des jours
  -- passés, elles, restent en base.
  day           date not null default ((now() at time zone 'Europe/Paris')::date),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, day)
);

-- Lecture de la journée, groupée par restaurant.
create index if not exists lunch_plans_day_restaurant_idx
  on public.lunch_plans (day, restaurant_id);

-- 2) RLS -----------------------------------------------------------------------
alter table public.lunch_plans enable row level security;

drop policy if exists "lunch_plans select authenticated" on public.lunch_plans;
create policy "lunch_plans select authenticated"
on public.lunch_plans for select to authenticated
using (true);

drop policy if exists "lunch_plans insert own" on public.lunch_plans;
create policy "lunch_plans insert own"
on public.lunch_plans for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "lunch_plans update own" on public.lunch_plans;
create policy "lunch_plans update own"
on public.lunch_plans for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "lunch_plans delete own" on public.lunch_plans;
create policy "lunch_plans delete own"
on public.lunch_plans for delete to authenticated
using (user_id = auth.uid());

-- 3) Realtime ------------------------------------------------------------------
-- Les avatars des collègues apparaissent en direct (même mécanique que
-- waiting_list : le client doit passer son JWT via realtime.setAuth).
--
-- replica identity full : sans elle, un DELETE ne transporte que la clé
-- primaire, et Realtime ne peut pas vérifier la RLS de la ligne supprimée — les
-- annulations ne seraient donc jamais diffusées aux autres postes.
alter table public.lunch_plans replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.lunch_plans;
exception
  when duplicate_object then null;
end;
$$;

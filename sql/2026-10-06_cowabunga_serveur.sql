-- =============================================================================
-- « Cowabunga ! » décerné côté serveur — 2026-10-06
-- Jusqu'ici, seul le client (useLunchToday) débloquait le succès, et seulement
-- le jour même : un membre de la tablée qui ne rouvrait pas l'appli après
-- l'arrivée du 4ᵉ (rectification tardive, après 14h…) ne l'avait jamais.
-- Désormais, un trigger sur lunch_plans le décerne à TOUTE la tablée dès
-- qu'elle atteint 4 (seuil = COWABUNGA_TABLE, src/data/achievements.ts).
--
-- Toast : une ligne insérée par le serveur porte seen = false ; le client
-- (useAchievements) affiche le toast puis l'acquitte via ack_achievements().
-- Les déblocages faits par le client gardent seen = true (défaut).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- Idempotent : à rejouer sans risque.
-- =============================================================================

-- 1) Drapeau « toast pas encore montré » ---------------------------------------
alter table public.user_achievements
  add column if not exists seen boolean not null default true;

-- Acquittement de ses propres succès vus (pas de policy update sur la table :
-- un succès reste définitif, seul ce drapeau est modifiable, et par soi).
create or replace function public.ack_achievements(ids text[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_achievements
     set seen = true
   where user_id = auth.uid()
     and achievement_id = any(ids)
     and not seen;
$$;

revoke all on function public.ack_achievements(text[]) from public, anon;
grant execute on function public.ack_achievements(text[]) to authenticated;

-- 2) Trigger -------------------------------------------------------------------
create or replace function public.grant_cowabunga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.restaurant_id is null then
    return new;
  end if;

  if (select count(*) from public.lunch_plans
       where day = new.day and restaurant_id = new.restaurant_id) >= 4 then
    insert into public.user_achievements (user_id, achievement_id, seen)
    select user_id, 'cowabunga', false
      from public.lunch_plans
     where day = new.day and restaurant_id = new.restaurant_id
    on conflict (user_id, achievement_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists lunch_plans_cowabunga on public.lunch_plans;
create trigger lunch_plans_cowabunga
after insert or update of restaurant_id on public.lunch_plans
for each row execute function public.grant_cowabunga();

-- 3) Rattrapage ----------------------------------------------------------------
-- Toute personne ayant déjà déjeuné à 4+ et à qui le succès a échappé l'obtient,
-- daté de sa première tablée qualifiante (heure d'inscription du dernier
-- arrivé). Les obtentions existantes ne sont pas touchées.
insert into public.user_achievements (user_id, achievement_id, unlocked_at, seen)
select lp.user_id, 'cowabunga', min(t.reached_at), false
  from public.lunch_plans lp
  join (select day, restaurant_id, max(created_at) as reached_at
          from public.lunch_plans
         where restaurant_id is not null
         group by day, restaurant_id
        having count(*) >= 4) t
    on t.day = lp.day and t.restaurant_id = lp.restaurant_id
 group by lp.user_id
on conflict (user_id, achievement_id) do nothing;

-- Contrôle :
--   select user_id, unlocked_at, seen from public.user_achievements
--    where achievement_id = 'cowabunga' order by unlocked_at;

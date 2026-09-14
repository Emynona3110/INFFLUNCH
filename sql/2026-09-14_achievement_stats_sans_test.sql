-- Le compte test (test@infflux.com) sert à essayer l'appli : ses succès ne
-- disent rien de l'équipe. On le sort du pourcentage d'obtention — au
-- numérateur comme au dénominateur — sans toucher à ses données.

create or replace function public.achievement_stats()
returns table (achievement_id text, percent real)
language sql
security definer
set search_path = public
as $$
  with counted as (
    select id from public.users where email <> 'test@infflux.com'
  )
  select ua.achievement_id,
         (count(distinct ua.user_id)::real
            / nullif((select count(*) from counted), 0) * 100)::real as percent
  from public.user_achievements ua
  join counted c on c.id = ua.user_id
  group by ua.achievement_id;
$$;

revoke all on function public.achievement_stats() from public;
grant execute on function public.achievement_stats() to authenticated;

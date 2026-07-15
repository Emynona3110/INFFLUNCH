-- =============================================================================
-- Nouveau lot de succès (contribution / assiduité) — 2026-07-13
-- La plupart des déblocages se comptent côté client à partir de données déjà en
-- base (avis, photos, favoris, réactions). Seul « Fidèle au poste » (se connecter
-- 5 jours d'affilée) a besoin d'un suivi persistant : on l'ajoute sur `profiles`
-- et on expose une fonction `touch_login()` appelée au chargement de l'app.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Idempotent.
-- =============================================================================

-- 1) Suivi du streak de connexion sur profiles ---------------------------------
alter table public.profiles add column if not exists last_login_day date;
alter table public.profiles add column if not exists login_streak int not null default 0;

-- 2) touch_login() : enregistre la connexion du jour et renvoie le streak -------
-- Appelée à chaque montage de l'app. Même jour = pas de changement. Jour + 1 =
-- streak++. Trou dans les jours = streak remis à 1. SECURITY DEFINER pour créer
-- la ligne profiles si elle n'existe pas encore (utilisateur sans avatar).
create or replace function public.touch_login()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today   date := (now() at time zone 'Europe/Paris')::date;
  v_last  date;
  v_streak int;
begin
  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;

  select last_login_day, login_streak into v_last, v_streak
  from public.profiles where id = auth.uid();

  if v_last = today then
    return coalesce(v_streak, 1);
  elsif v_last = today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
     set last_login_day = today, login_streak = v_streak
   where id = auth.uid();
  return v_streak;
end;
$$;

revoke all on function public.touch_login() from public;
grant execute on function public.touch_login() to authenticated;

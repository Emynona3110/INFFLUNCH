-- Heure de départ du midi (2026-10-14)
--
-- Chacun peut indiquer l'heure approximative à laquelle il part déjeuner, par
-- tranche de 15 minutes entre 11 h 30 et 14 h. null = « je ne sais pas ».
-- Une heure n'a de sens qu'avec un restaurant : « pas de resto » / « pas sur
-- site » n'en portent jamais.
--
-- Aucune policy à toucher : la colonne suit les règles de la ligne (lecture par
-- tout utilisateur connecté, écriture de sa propre ligne). Le trigger Cowabunga
-- n'écoute que restaurant_id, il ne se déclenche pas sur un changement d'heure.

alter table public.lunch_plans
  add column if not exists departure_time time;

alter table public.lunch_plans
  drop constraint if exists lunch_plans_departure_time_valid;
alter table public.lunch_plans
  add constraint lunch_plans_departure_time_valid check (
    departure_time is null
    or (
      restaurant_id is not null
      and departure_time between time '11:30' and time '14:00'
      and extract(minute from departure_time)::int % 15 = 0
      and extract(second from departure_time) = 0
    )
  );

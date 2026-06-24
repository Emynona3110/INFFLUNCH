-- Temps de marche réel (réseau piéton) depuis INFFLUX, en minutes.
-- Calculé une seule fois à l'enregistrement (Edge Function walk-time → ORS) et
-- stocké ici, comme lat/lng. NULL = non encore calculé.
--
-- Aucune nouvelle policy : les écritures sur public.restaurants sont déjà
-- réservées aux admins (RLS existante), la lecture est `TO authenticated`.

alter table public.restaurants
  add column if not exists walk_minutes int;

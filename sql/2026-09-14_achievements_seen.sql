-- =============================================================================
-- Pastille « nouveaux succès » : dernier déblocage consulté, EN BASE — 2026-09-14
-- Jusqu'ici en localStorage : partagé entre comptes sur un même navigateur,
-- et vide sur un autre appareil → pastille fantôme. Désormais par utilisateur,
-- tous appareils. Upsert par le client (RLS profiles insert/update own OK).
-- =============================================================================
alter table public.profiles
  add column if not exists achievements_seen_at timestamptz;

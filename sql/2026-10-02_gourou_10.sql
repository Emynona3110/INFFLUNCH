-- =============================================================================
-- Gourou du troupeau : 10 nourritures d'affilée au lieu de 20 — 2026-10-02
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

update public.achievement_secrets
set condition = 'Nourrir un mouton 10 fois d''affilée'
where id = 'gourou_du_troupeau';

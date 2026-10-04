-- ---------------------------------------------------------------------------
-- Suppression du succès « Gourou du troupeau » (gourou_du_troupeau) — 2026-10-05
-- Retiré du catalogue (il était désactivé) : on efface ses obtentions et sa
-- condition secrète, sinon ce seraient des lignes orphelines.
-- À jouer après le déploiement du front.
-- ---------------------------------------------------------------------------

-- Combien de collègues l'avaient (pour info, avant suppression).
select count(*) as obtentions
from public.user_achievements
where achievement_id = 'gourou_du_troupeau';

delete from public.user_achievements
where achievement_id = 'gourou_du_troupeau';

delete from public.achievement_secrets
where id = 'gourou_du_troupeau';

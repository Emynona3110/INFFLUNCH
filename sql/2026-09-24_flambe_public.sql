-- « Flambé » n'est plus un succès secret : sa condition est désormais en dur
-- dans le catalogue (src/data/achievements.ts), plus besoin de la ligne en base.
delete from public.achievement_secrets where id = 'flambe';

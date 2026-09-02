-- =============================================================================
-- Renommage de tag : propagation durcie — 2026-09-02
-- Remplace `public.tags_sync_restaurants()` (2026-09-02_tags_lies_restaurants).
-- Le trigger lui-même n'est pas retouché, seule la fonction change.
--
-- Ce qui change :
--   • le rapprochement se fait sans tenir compte de la CASSE ni des espaces
--     superflus. Avant, un restaurant portant « moshi » ou « Moshi » (avec un
--     espace de fin) n'était pas reconnu lors du renommage de « Moshi » : le
--     libellé restait tel quel, devenait orphelin, et le premier nettoyage venu
--     le retirait — ce qui donne exactement l'impression d'une suppression ;
--   • `tags` ne peut plus devenir NULL (coalesce sur un tableau vide) ;
--   • un `raise notice` indique combien de fiches ont été touchées, visible
--     dans l'éditeur SQL comme dans les logs Postgres.
--
-- Le comportement voulu reste inchangé : SUPPRIMER un tag le retire des
-- restaurants, le RENOMMER met à jour les restaurants — jamais l'inverse.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

create or replace function public.tags_sync_restaurants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- ---- Suppression : le tag disparaît des restaurants qui le portent -------
  if tg_op = 'DELETE' then
    update public.restaurants r
    set tags = coalesce(
      (
        select array_agg(u.v order by u.ord)
        from unnest(r.tags) with ordinality as u(v, ord)
        where lower(btrim(u.v)) is distinct from lower(btrim(old.label))
      ),
      '{}'
    )
    where exists (
      select 1
      from unnest(r.tags) as v
      where lower(btrim(v)) = lower(btrim(old.label))
    );

    get diagnostics n = row_count;
    raise notice 'Tag supprimé « % » : retiré de % restaurant(s).', old.label, n;
    return old;
  end if;

  -- ---- Renommage : les restaurants suivent, sans rien perdre ---------------
  if new.label is distinct from old.label then
    update public.restaurants r
    set tags = coalesce(
      (
        select array_agg(x.label order by x.ord)
        from (
          select case
                   when lower(btrim(u.v)) = lower(btrim(old.label)) then new.label
                   else u.v
                 end as label,
                 min(u.ord) as ord
          from unnest(r.tags) with ordinality as u(v, ord)
          group by 1
        ) x
      ),
      '{}'
    )
    where exists (
      select 1
      from unnest(r.tags) as v
      where lower(btrim(v)) = lower(btrim(old.label))
    );

    get diagnostics n = row_count;
    raise notice 'Tag renommé « % » → « % » : % restaurant(s) mis à jour.',
      old.label, new.label, n;
  end if;

  return new;
end;
$$;

-- Le trigger existant continue de pointer sur cette fonction ; on le recrée par
-- sécurité au cas où le script d'origine n'aurait pas été joué jusqu'au bout.
drop trigger if exists trigger_tags_sync_restaurants on public.tags;
create trigger trigger_tags_sync_restaurants
after update of label or delete on public.tags
for each row execute function public.tags_sync_restaurants();

-- Contrôles :
--   -- tags portés par un resto mais absents de la table (orphelins à récupérer
--   -- AVANT tout nettoyage : c'est la trace d'un renommage non propagé) :
--   select distinct v as tag_orphelin, count(*) over (partition by v) as restos
--   from public.restaurants r, unnest(r.tags) as v
--   where not exists (select 1 from public.tags t where t.label = v);
--
--   -- réparation type, si « Moshi » traîne encore sur des fiches :
--   -- update public.restaurants
--   -- set tags = array_replace(tags, 'Moshi', 'Mochi')
--   -- where tags @> array['Moshi'];

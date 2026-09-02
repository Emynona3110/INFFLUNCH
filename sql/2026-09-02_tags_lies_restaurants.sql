-- =============================================================================
-- Tags liés aux restaurants — 2026-09-02
-- Les restaurants stockent leurs tags en `text[]` de libellés : rien ne
-- garantissait jusqu'ici qu'un libellé existe encore dans la table `tags`.
-- Résultat : des tags fantômes affichés sur les fiches mais absents des
-- filtres (et invisibles dans l'admin).
--
-- Ce script :
--   1. normalise les libellés (sauts de ligne / espaces multiples / casse) des
--      deux côtés — indispensable AVANT le nettoyage, sinon `Bento\n` ≠ `Bento`
--      et on retirerait des tags parfaitement valides ;
--   2. retire des restaurants les tags qui n'existent plus dans `tags` ;
--   3. installe un trigger qui maintient le lien pour la suite : supprimer un
--      tag le retire de tous les restaurants, le renommer les met à jour.
--
-- Non destructif côté contributions (avis, photos, menus, favoris) : seule la
-- colonne `restaurants.tags` est touchée.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- Contrôle AVANT (à lancer à la main, avant tout le reste) :
--   select r.slug, v as tag_orphelin
--   from public.restaurants r, unnest(r.tags) as v
--   where not exists (
--     select 1 from public.tags t
--     where lower(btrim(regexp_replace(t.label, '\s+', ' ', 'g'))) = lower(btrim(v))
--   )
--   order by r.slug;

-- 0) Normalisation d'un libellé : espaces/sauts de ligne compactés et rognés --
create or replace function public.normalize_tag_label(input text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(coalesce(input, ''), '\s+', ' ', 'g'));
$$;

-- 1a) Table `tags` : dédoublonnage puis nettoyage des libellés ----------------
-- La normalisation peut faire se rejoindre deux lignes ("Bento" et "Bento\n") :
-- on garde le plus petit id, sinon l'index unique sur `label` bloque l'update.
delete from public.tags t
using public.tags k
where public.normalize_tag_label(t.label) = public.normalize_tag_label(k.label)
  and t.id > k.id;

update public.tags
set label = public.normalize_tag_label(label)
where label is distinct from public.normalize_tag_label(label);

-- 1b) Restaurants : mêmes libellés nettoyés, doublons retirés, ordre conservé -
update public.restaurants r
set tags = coalesce(n.tags, '{}')
from (
  select
    r2.id,
    (
      select array_agg(x.label order by x.ord)
      from (
        select public.normalize_tag_label(u.v) as label, min(u.ord) as ord
        from unnest(r2.tags) with ordinality as u(v, ord)
        where public.normalize_tag_label(u.v) <> ''
        group by 1
      ) x
    ) as tags
  from public.restaurants r2
  where r2.tags is not null
) n
where r.id = n.id
  and r.tags is distinct from coalesce(n.tags, '{}');

-- 2) Nettoyage des tags orphelins --------------------------------------------
-- Comparaison insensible à la casse : un tag qui n'existe qu'à la casse près
-- ("Sur place" vs "Sur Place") est réaligné sur le libellé de la table `tags`
-- plutôt que supprimé. Tout ce qui n'a aucune correspondance est retiré.
update public.restaurants r
set tags = coalesce(
  (
    select array_agg(x.label order by x.ord)
    from (
      select t.label, min(u.ord) as ord
      from unnest(r.tags) with ordinality as u(v, ord)
      join public.tags t on lower(t.label) = lower(u.v)
      group by t.label
    ) x
  ),
  '{}'
)
where r.tags is not null
  and exists (
    select 1
    from unnest(r.tags) as v
    where not exists (select 1 from public.tags t where t.label = v)
  );

-- 3) Le lien pour la suite : trigger sur `tags` -------------------------------
create or replace function public.tags_sync_restaurants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Suppression d'un tag : on le retire de tous les restaurants qui le portent.
  if tg_op = 'DELETE' then
    update public.restaurants
    set tags = array_remove(tags, old.label)
    where tags @> array[old.label];
    return old;
  end if;

  -- Renommage : on répercute le nouveau libellé (et on dédoublonne au cas où le
  -- restaurant portait déjà les deux tags), en gardant l'ordre d'origine.
  if new.label is distinct from old.label then
    update public.restaurants r
    set tags = (
      select array_agg(x.label order by x.ord)
      from (
        select case when u.v = old.label then new.label else u.v end as label,
               min(u.ord) as ord
        from unnest(r.tags) with ordinality as u(v, ord)
        group by 1
      ) x
    )
    where r.tags @> array[old.label];
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_tags_sync_restaurants on public.tags;
create trigger trigger_tags_sync_restaurants
after update of label or delete on public.tags
for each row execute function public.tags_sync_restaurants();

-- Contrôle APRÈS :
--   -- doit renvoyer 0 ligne :
--   select r.slug, v as tag_orphelin
--   from public.restaurants r, unnest(r.tags) as v
--   where not exists (select 1 from public.tags t where t.label = v);
--
--   -- tags jamais utilisés (informatif, on ne supprime rien) :
--   select t.label
--   from public.tags t
--   where not exists (
--     select 1 from public.restaurants r where r.tags @> array[t.label]
--   )
--   order by t.label;

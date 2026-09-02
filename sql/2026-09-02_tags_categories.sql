-- =============================================================================
-- Catégories de tags — 2026-09-02
-- ⚠️ À exécuter APRÈS `2026-09-02_tags_lies_restaurants.sql` (qui normalise les
-- libellés : sans ça, les `on conflict (label)` ne matcheraient pas les tags
-- comportant un saut de ligne).
--
-- Trois catégories, volontairement peu nombreuses :
--   • origine         : la cuisine / le pays (Français, Japonais, Turc…)
--   • caracteristique : le type de lieu, le service, l'ambiance, le régime
--                       (Bistrot, Terrasse, Traiteur, Boulangerie, Bio, Casher…)
--   • specialite      : le plat ou le produit (Kebab, Sushi, Salade, Quiche…)
--
-- Le script installe la colonne puis sème la liste de référence issue des deux
-- exports (restaurants + commerces alimentaires) : les tags déjà présents sont
-- simplement catégorisés (aucun doublon, aucune suppression), les manquants
-- sont créés. Un tag absent de la liste garde la valeur par défaut
-- (`specialite`) et se recatégorise en un clic depuis l'admin.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) La colonne ---------------------------------------------------------------
alter table public.tags
  add column if not exists category text not null default 'specialite';

alter table public.tags drop constraint if exists tags_category_check;
alter table public.tags add constraint tags_category_check
  check (category in ('origine', 'caracteristique', 'specialite'));

comment on column public.tags.category is
  'origine = cuisine/pays · caracteristique = type de lieu, service, ambiance, régime · specialite = plat ou produit.';

-- 2) Liste de référence (catégorise l'existant ET crée les nouveaux) ----------
with ref(label, category) as (
  values
    -- Origines ---------------------------------------------------------------
    ('Français', 'origine'),
    ('Italien', 'origine'),
    ('Japonais', 'origine'),
    ('Chinois', 'origine'),
    ('Vietnamien', 'origine'),
    ('Thaï', 'origine'),
    ('Coréen', 'origine'),
    ('Indien', 'origine'),
    ('Turc', 'origine'),
    ('Libanais', 'origine'),
    ('Iranien', 'origine'),
    ('Portugais', 'origine'),
    ('Mexicain', 'origine'),
    ('Tex-Mex', 'origine'),
    ('Américain', 'origine'),
    ('Californien', 'origine'),
    ('Hawaïen', 'origine'),
    ('Méditerranéen', 'origine'),
    ('Tunisien', 'origine'),
    ('Africain', 'origine'),
    ('Camerounais', 'origine'),
    ('Sud-Africain', 'origine'),

    -- Caractéristiques (lieu, service, ambiance, régime) ----------------------
    ('Bistrot', 'caracteristique'),
    ('Brasserie', 'caracteristique'),
    ('Café', 'caracteristique'),
    ('Coffee Shop', 'caracteristique'),
    ('Crêperie', 'caracteristique'),
    ('Boulangerie', 'caracteristique'),
    ('Pâtisserie', 'caracteristique'),
    ('Rôtisserie', 'caracteristique'),
    ('Traiteur', 'caracteristique'),
    ('Terrasse', 'caracteristique'),
    ('Brunch', 'caracteristique'),
    ('Snacking', 'caracteristique'),
    ('Bio', 'caracteristique'),
    ('Casher', 'caracteristique'),
    ('Supermarché', 'caracteristique'),
    ('Supérette', 'caracteristique'),
    ('Épicerie', 'caracteristique'),
    ('Épicerie Fine', 'caracteristique'),
    ('Boucherie', 'caracteristique'),
    ('Charcuterie', 'caracteristique'),
    ('Fromagerie', 'caracteristique'),
    ('Poissonnerie', 'caracteristique'),
    ('Primeur', 'caracteristique'),

    -- Spécialités / plats / produits -----------------------------------------
    ('Kebab', 'specialite'),
    ('Dürüm', 'specialite'),
    ('Pide', 'specialite'),
    ('Lahmacun', 'specialite'),
    ('Grillades', 'specialite'),
    ('Sandwich', 'specialite'),
    ('Panini', 'specialite'),
    ('Bagel', 'specialite'),
    ('Tartine', 'specialite'),
    ('Grilled Cheese', 'specialite'),
    ('Hot-Dog', 'specialite'),
    ('Burger', 'specialite'),
    ('Smash Burger', 'specialite'),
    ('Frites', 'specialite'),
    ('Milkshake', 'specialite'),
    ('Quiche', 'specialite'),
    ('Soupe', 'specialite'),
    ('Salade', 'specialite'),
    ('Bowl', 'specialite'),
    ('Poké Bowl', 'specialite'),
    ('Pizza', 'specialite'),
    ('Pâtes', 'specialite'),
    ('Risotto', 'specialite'),
    ('Antipasti', 'specialite'),
    ('Escalope', 'specialite'),
    ('Tapas', 'specialite'),
    ('Couscous', 'specialite'),
    ('Mezzé', 'specialite'),
    ('Falafel', 'specialite'),
    ('Shawarma', 'specialite'),
    ('Tandoori', 'specialite'),
    ('Biryani', 'specialite'),
    ('Naan', 'specialite'),
    ('Curry', 'specialite'),
    ('Pad Thaï', 'specialite'),
    ('Nouilles', 'specialite'),
    ('Bobun', 'specialite'),
    ('Nems', 'specialite'),
    ('Phở', 'specialite'),
    ('Bao', 'specialite'),
    ('Dim Sum', 'specialite'),
    ('Raviolis', 'specialite'),
    ('Ravioles', 'specialite'),
    ('Sushi', 'specialite'),
    ('Sashimi', 'specialite'),
    ('Chirashi', 'specialite'),
    ('Yakitori', 'specialite'),
    ('Ramen', 'specialite'),
    ('Donburi', 'specialite'),
    ('Bento', 'specialite'),
    ('Gyoza', 'specialite'),
    ('Karaage', 'specialite'),
    ('Bibimbap', 'specialite'),
    ('Bulgogi', 'specialite'),
    ('Japchae', 'specialite'),
    ('Tteokbokki', 'specialite'),
    ('Mandu', 'specialite'),
    ('Corn Dog', 'specialite'),
    ('Poulet Frit', 'specialite'),
    ('Wings', 'specialite'),
    ('Poulet', 'specialite'),
    ('Poulet Grillé', 'specialite'),
    ('Viande', 'specialite'),
    ('Tartare', 'specialite'),
    ('Morue', 'specialite'),
    ('Poisson', 'specialite'),
    ('Fruits de Mer', 'specialite'),
    ('Huîtres', 'specialite'),
    ('Mafé', 'specialite'),
    ('Yassa', 'specialite'),
    ('Alloco', 'specialite'),
    ('Tacos', 'specialite'),
    ('Burrito', 'specialite'),
    ('Quesadilla', 'specialite'),
    ('Fajitas', 'specialite'),
    ('Galette', 'specialite'),
    ('Crêpe', 'specialite'),
    ('Viennoiserie', 'specialite'),
    ('Chocolat', 'specialite'),
    ('Macaron', 'specialite'),
    ('Thé', 'specialite'),
    ('Fromage', 'specialite'),
    ('Fruits', 'specialite'),
    ('Légumes', 'specialite'),
    ('Fruits Secs', 'specialite'),
    ('Épices', 'specialite'),
    ('Foie Gras', 'specialite'),
    ('Terrine', 'specialite'),
    ('Caviar', 'specialite'),
    ('Truffe', 'specialite')
)
insert into public.tags (label, category)
select r.label, r.category
from ref r
on conflict (label) do update
  set category = excluded.category;

-- Contrôles :
--   -- répartition :
--   select category, count(*) from public.tags group by category order by 1;
--
--   -- revue à l'œil : les tags qui n'étaient pas dans la liste de référence
--   -- sont tombés dans « specialite » par défaut :
--   select category, label from public.tags order by category, label;
--
--   -- tags créés mais utilisés par aucun restaurant (normal pour les tags
--   -- « commerces » tant qu'on n'a pas importé les commerces) :
--   select label from public.tags t
--   where not exists (select 1 from public.restaurants r where r.tags @> array[t.label])
--   order by label;

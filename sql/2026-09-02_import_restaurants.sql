-- =============================================================================
-- Import des restaurants (export 2026-09-02) — tags, badges, adresse, tél, site
-- ⚠️ À exécuter APRÈS `2026-09-02_tags_lies_restaurants.sql` et
-- `2026-09-02_tags_categories.sql` (les 135 tags du CSV y sont déjà créés).
--
-- Ce que fait le script :
--   • sauvegarde complète de `restaurants` dans
--     `public.restaurants_backup_2026_09_02` avant toute écriture (§0, avec la
--     marche à suivre pour revenir en arrière) ;
--   • rapprochement des restaurants existants par NOM NORMALISÉ (minuscules,
--     sans accents ni ponctuation) et NON par slug : les slugs historiques
--     `bills-burger` et `durum--brunch` ne suivent pas la règle actuelle de
--     `slugify`, un rapprochement par slug les dupliquerait ;
--   • restaurant déjà connu : tags et badges remplacés par ceux du CSV,
--     téléphone et site web mis à jour, adresse complétée SEULEMENT si elle
--     était vide (le pin lat/lng a été placé à la main : changer l'adresse sous
--     lui le rendrait faux — les écarts sont listés en contrôle à la fin) ;
--   • restaurant inconnu : création avec un slug libre (suffixe -2, -3… en cas
--     de collision, ex. « Maison Des Laitières » et « La Maison Des Laitières »
--     qui donnent le même slug) ;
--   • RIEN n'est supprimé : ni restaurant, ni avis, ni photo, ni menu. Les
--     restaurants absents du CSV ne sont pas touchés (les fermés le restent).
--
-- ⚠️ APRÈS ce script, les nouveaux restaurants n'ont que leur adresse : ni
-- coordonnées, ni distance, ni temps de marche, ni image. Rien de tout cela ne
-- se calcule en SQL seul — le géocodage (Nominatim) et le temps de marche (ORS)
-- sont des appels réseau. Deux commandes suffisent, dans cet ordre :
--   1. `node scripts/backfill-coords.mjs`       → lat / lng (adresse géocodée)
--      + `distance` et `distanceLabel` (pastille « 400m » des cards et score de
--        proximité) : le script les calcule désormais dans la foulée.
--   2. `node scripts/backfill-walk-minutes.mjs` → walk_minutes (ORS, repli sur
--      une estimation vol d'oiseau × 1,3 si ORS est indisponible), puis
--      `recalc_relevance()` appelé automatiquement en fin de script.
--   Les deux demandent un compte admin (cf. leur en-tête) et ne traitent que
--   les lignes incomplètes : relançables sans risque.
--   Filet de sécurité si des coordonnées ont été posées autrement (pin placé à
--   la main, import partiel…) : `select public.refresh_distances();` remplit
--   distance + distanceLabel partout où ils manquent.
--   Le calendrier n'est plus critique depuis `2026-09-02_restaurants_incomplets_admin.sql`
--   (à jouer avant celui-ci) : tant qu'un restaurant n'a pas de `distance`, la
--   RLS ne le montre qu'aux admins — il n'apparaît donc ni dans la liste, ni
--   sur la carte, ni au tirage du midi.
--   Tant que l'étape 1 n'est pas passée, la vue de pertinence donne le score de
--   proximité MAXIMAL (règle « distance inconnue = 1.0 ») : les nouveaux
--   seraient surclassés dans la liste.
--
-- À exécuter d'une seule traite (table temporaire) sur le projet Supabase
-- (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 0) Sauvegarde de la table `restaurants` --------------------------------------
-- Copie complète AVANT toute écriture. Créée une seule fois : si la table de
-- sauvegarde existe déjà (2e exécution du script), on la GARDE telle quelle,
-- sinon on écraserait la photo d'avant-import par une photo d'après-import.
-- RLS activée sans aucune policy + droits révoqués : la copie n'est lisible que
-- depuis l'éditeur SQL, jamais par l'API (une table nue dans `public` serait
-- sinon exposée à tous les comptes connectés).
do $$
begin
  if to_regclass('public.restaurants_backup_2026_09_02') is null then
    execute 'create table public.restaurants_backup_2026_09_02 as
             select * from public.restaurants';
    execute 'alter table public.restaurants_backup_2026_09_02 enable row level security';
    execute 'revoke all on public.restaurants_backup_2026_09_02 from anon, authenticated';
    raise notice 'Sauvegarde créée : public.restaurants_backup_2026_09_02';
  else
    raise notice 'Sauvegarde déjà présente, conservée (elle date de la 1re exécution)';
  end if;
end;
$$;

-- Retour en arrière (à jouer juste après l'import, sinon on annulerait aussi ce
-- qui a été fait entre-temps dans l'admin) :
--   -- 1. supprimer les restaurants créés par l'import
--   --    (ils n'ont ni avis, ni photo, ni menu : ils viennent de naître)
--   delete from public.restaurants r
--   where not exists (
--     select 1 from public.restaurants_backup_2026_09_02 b where b.id = r.id
--   );
--   -- 2. remettre les colonnes modifiées sur les restaurants existants
--   update public.restaurants r
--   set tags = b.tags, badges = b.badges, phone = b.phone,
--       website = b.website, address = b.address
--   from public.restaurants_backup_2026_09_02 b
--   where b.id = r.id;
--   -- 3. select public.recalc_relevance();
--
-- Une fois l'import validé, la sauvegarde peut être supprimée :
--   drop table public.restaurants_backup_2026_09_02;

-- 1) Utilitaires ---------------------------------------------------------------
-- Nom normalisé : sert UNIQUEMENT au rapprochement (casse, accents, ponctuation
-- et espaces ignorés) — « L'Atelier Du Naan » = « L'Atelier du Naan ».
create or replace function public.norm_name(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           translate(
             lower(coalesce(input, '')),
             'áàâäãåéèêëíìîïóòôöõúùûüýÿñçœæ',
             'aaaaaaeeeeiiiiooooouuuuyyncoa'),
           '[^a-z0-9]', '', 'g');
$$;

-- Slug identique à `src/utils/slugify.ts` (article et élision en tête retirés,
-- accents supprimés, apostrophes en tiret). Utilisé pour les CRÉATIONS
-- uniquement : les slugs existants ne sont jamais recalculés.
create or replace function public.slugify_fr(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              regexp_replace(
                regexp_replace(lower(coalesce(input, '')), '^(la|le|les|the)\s+', ''),
                '^(l|d|j|m|t|s|n|c|qu)''', ''),
              'áàâäãåéèêëíìîïóòôöõúùûüýÿñçœæ',
              'aaaaaaeeeeiiiiooooouuuuyyncoa'),
            '[''’\s]+', '-', 'g'),
          '[^a-z0-9_-]', '', 'g'),
        '-+', '-', 'g'),
      '^-+|-+$', '', 'g'));
$$;

-- Distance à vol d'oiseau depuis INFFLUX (48.8487433, 2.4280408), en km.
-- Même calcul que le front (Leaflet `distanceTo`, sphère de 6371 km) : c'est
-- une pure fonction de lat/lng, donc calculable en SQL — contrairement au
-- géocodage (Nominatim) et au temps de marche réel (ORS), qui demandent un
-- appel réseau et passent par les scripts `scripts/backfill-*.mjs`.
create or replace function public.distance_km_from_infflux(
  p_lat double precision,
  p_lng double precision
)
returns double precision
language sql
immutable
as $$
  select 6371.0 * 2 * asin(sqrt(
      power(sin(radians(p_lat - 48.8487433) / 2), 2)
    + cos(radians(48.8487433)) * cos(radians(p_lat))
      * power(sin(radians(p_lng - 2.4280408) / 2), 2)));
$$;

-- Libellé historique : « 1.2km » au-delà du kilomètre, « 350m » en dessous
-- (arrondi à la dizaine) — identique à `formatDistance` dans le front.
create or replace function public.format_distance(km double precision)
returns text
language sql
immutable
as $$
  select case
    when km is null then null
    when km >= 1 then to_char(round(km::numeric, 1), 'FM990.0') || 'km'
    else (round(km * 1000 / 10) * 10)::int::text || 'm'
  end;
$$;

-- Remplit `distance` et `distanceLabel` pour tout restaurant qui a des
-- coordonnées mais pas encore sa distance. À RELANCER APRÈS LE GÉOCODAGE
-- (`select public.refresh_distances();`) : au moment de l'import, les nouveaux
-- n'ont pas encore de lat/lng, donc cet appel-ci ne fera rien.
-- Les distances déjà renseignées ne sont pas retouchées.
create or replace function public.refresh_distances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.restaurants r
  set distance        = public.distance_km_from_infflux(r.lat, r.lng)::real,
      "distanceLabel" = public.format_distance(
                          public.distance_km_from_infflux(r.lat, r.lng))
  where r.lat is not null
    and r.lng is not null
    and (r.distance is null or r."distanceLabel" is null);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- 2) Données du CSV ------------------------------------------------------------
create temporary table csv_import (
  name    text not null,
  tags    text[],
  badges  text[],
  address text,
  phone   text,
  website text
);

insert into csv_import (name, tags, badges, address, phone, website) values
  ('Anamour', array['Turc', 'Kebab', 'Grillades', 'Sandwich', 'Pide'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '1 Rue des Laitières, 94300 Vincennes', '07 54 05 50 28', null),
  ('Authentic Bento', array['Japonais', 'Bento', 'Donburi'], array['À Emporter', 'Option Végétarienne', 'TooGoodToGo'], '18 Avenue Georges Clemenceau, 94300 Vincennes', '06 58 50 68 88', null),
  ('Bill''s Burger', array['Burger', 'Smash Burger', 'Frites', 'Milkshake'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '21 Rue de Lagny, 94300 Vincennes', '01 70 13 21 63', 'https://billsburger.dishop.co/'),
  ('Boulangerie Pâtisserie', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Quiche'], array['À Emporter'], '114 Rue Marceau, 93100 Montreuil', '01 48 59 35 69', null),
  ('Boun', array['Thaï', 'Pad Thaï', 'Curry', 'Nouilles'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '31 Rue Massue, 94300 Vincennes', null, null),
  ('Chez Les Soeurs', array['Vietnamien', 'Français', 'Bobun', 'Nems', 'Nouilles'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '175 Rue de Fontenay, 94300 Vincennes', '01 88 27 00 76', null),
  ('Durum & Brunch', array['Turc', 'Dürüm', 'Pide', 'Lahmacun', 'Grillades', 'Brunch'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '6 Avenue de la République, 94300 Vincennes', '07 67 74 23 96', 'https://www.instagram.com/durumbrunch/'),
  ('Fa Fa', array['Chinois', 'Vietnamien', 'Traiteur', 'Dim Sum', 'Bobun', 'Nouilles'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '1 Rue des Laitières, 94300 Vincennes', null, 'https://fafa94.fr/'),
  ('G20', array['Supérette', 'Sandwich', 'Salade', 'Snacking'], array['Magasin', 'À Emporter'], '44 Rue de Lagny, 93100 Montreuil', '01 43 60 91 85', 'https://www.supermarchesg20.com/'),
  ('Hercule', array['Turc', 'Kebab', 'Grillades', 'Sandwich'], array['Sur Place', 'À Emporter'], '30 Rue de Lagny, 93100 Montreuil', '01 41 50 45 33', null),
  ('L''Atelier Du Naan', array['Indien', 'Naan', 'Sandwich'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '36 Rue de Lagny, 93100 Montreuil', '01 75 47 04 08', null),
  ('L''Égalité', array['Français', 'Bistrot', 'Couscous'], array['Sur Place', 'Bar'], '189 Rue de Fontenay, 94300 Vincennes', '09 83 71 16 51', null),
  ('La Cantine', array['Français', 'Bistrot', 'Terrasse'], array['Sur Place', 'Bar', 'Option Végétarienne'], '10 Rue Victor Basch, 94300 Vincennes', '01 43 28 48 72', 'https://la-cantine-de-vincennes-restaurant.eatbu.com/'),
  ('Le Génésis', array['Français', 'Brasserie', 'Pizza', 'Burger', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '20 Rue des Laitières, 94300 Vincennes', '09 74 56 43 05', 'https://genesis-vincennes.com/'),
  ('Le Nid À Frango', array['Portugais', 'Poulet Grillé', 'Rôtisserie', 'Pâtisserie'], array['À Emporter'], '2 Rue Victor Basch, 94300 Vincennes', '01 43 65 21 68', null),
  ('Lolivà', array['Italien', 'Pâtes', 'Antipasti', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '32 Rue de Lagny, 93100 Montreuil', '06 85 29 91 42', 'https://www.lolivarestaurant.fr/'),
  ('Maison Des Laitières', array['Français', 'Italien', 'Brasserie', 'Pizza', 'Burger', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '38 Rue de Lagny, 93100 Montreuil', '09 56 20 18 35', 'https://le-bl.metro.biz/'),
  ('Napoli Gang By Big Mamma', array['Italien', 'Pizza', 'Pâtes', 'Antipasti'], array['À Emporter', 'Option Végétarienne'], '1 Rue de Lagny, 94300 Vincennes', null, 'https://napoligang.fr/'),
  ('O'' Five Pizza', array['Pizza', 'Panini', 'Tex-Mex'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '21 Rue de Lagny, 94300 Vincennes', '01 43 65 10 94', null),
  ('Oyama Sushi', array['Japonais', 'Sushi', 'Yakitori', 'Ramen', 'Poké Bowl'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '42 Rue de Lagny, 93100 Montreuil', '06 51 60 23 68 / 01 70 24 20 55', 'https://www.oyamasushi.fr/'),
  ('Pousses', array['Salade', 'Bowl', 'Tartine', 'Pâtisserie', 'Coffee Shop', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '14 Rue de Lagny, 93100 Montreuil', '07 69 09 54 40', 'https://www.poussesmontreuil.com/'),
  ('Titan', array['Turc', 'Kebab', 'Grillades', 'Sandwich'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '184 Rue de Fontenay, 94300 Vincennes', '01 43 91 79 47', null),
  ('Aux Longs Quartiers', array['Français', 'Bistrot', 'Brasserie'], array['Sur Place', 'À Emporter', 'Bar'], '54 Rue Gambetta, 93100 Montreuil', '01 48 59 01 43', null),
  ('Pizzeria Del Monte', array['Italien', 'Pizza', 'Panini'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '12 Rue de Lagny, 93100 Montreuil', '01 48 57 20 10', null),
  ('La Maison Des Laitières', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Quiche'], array['À Emporter', 'Option Végétarienne'], '35 Rue des Laitières, 94300 Vincennes', '01 46 82 48 89', null),
  ('Mây Bay', array['Vietnamien', 'Nems', 'Bobun', 'Curry'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '33 Rue des Laitières, 94300 Vincennes', '01 43 28 86 91', 'https://maybayrestaurant.com/'),
  ('M I M', array['Français', 'Bistrot', 'Café'], array['Sur Place', 'Bar', 'Option Végétarienne'], '113 Rue Marceau, 93100 Montreuil', '01 43 63 31 13', null),
  ('Golden Pizza Vincennes', array['Italien', 'Japonais', 'Casher', 'Pizza', 'Sushi', 'Pâtes'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '28 Rue des Laitières, 94300 Vincennes', '01 46 82 26 26', null),
  ('LE VINZEN', array['Français', 'Bistrot', 'Grillades', 'Burger', 'Tartare', 'Terrasse'], array['Sur Place', 'Bar'], '202 Rue de Fontenay, 94300 Vincennes', '01 43 28 04 58', 'https://levinzen.fr/'),
  ('Boulangerie Laitières', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Quiche'], array['À Emporter', 'Option Végétarienne'], '12 Rue des Laitières, 94300 Vincennes', null, null),
  ('La MiN (HaShamayim)', array['Français', 'Bistrot', 'Poisson', 'Viande', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '55 Rue de Lagny, 94300 Vincennes', '01 86 04 55 82', null),
  ('L''Indio', array['Californien', 'Brunch', 'Bowl', 'Burger', 'Tacos'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '120 bis Rue de Lagny, 93100 Montreuil', '01 43 60 70 89 / 06 35 33 52 16', null),
  ('Terra Viva', array['Italien', 'Pâtes', 'Risotto', 'Antipasti', 'Pâtisserie'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '38 Rue Carnot, 93100 Montreuil', '01 88 49 46 13', 'https://www.terravivamontreuil.fr/'),
  ('Crêperie Sucré Salé', array['Français', 'Crêperie', 'Galette', 'Crêpe', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '9 Avenue de la République, 94300 Vincennes', '01 43 65 43 60', 'https://creperie-vincennes-sucresale.eatbu.com/'),
  ('Hee Korean Chef', array['Coréen', 'Bibimbap', 'Bulgogi', 'Poulet Frit', 'Bento', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '65 Rue Marceau, 93100 Montreuil', '09 77 65 89 60', 'https://www.heekoreanchef.com/'),
  ('Bistrot ben et kei', array['Français', 'Japonais', 'Bistrot', 'Bento', 'Karaage'], array['Sur Place', 'À Emporter'], '19 Avenue Georges Clemenceau, 94300 Vincennes', '06 85 95 74 56', 'https://www.instagram.com/bistrot.benetkei.vincennes/'),
  ('Les Petits Vignerons', array['Français', 'Bistrot', 'Viande', 'Ravioles'], array['Sur Place', 'Bar', 'Option Végétarienne'], '51 Rue de Fontenay, 94300 Vincennes', '01 49 57 05 30', 'https://lespetitsvignerons.fr/'),
  ('Bolkiri Montreuil', array['Vietnamien', 'Bao', 'Phở', 'Bobun', 'Nems'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '7 Boulevard Rouget de Lisle, 93100 Montreuil', '01 48 58 44 00', 'https://restaurants.bolkiri.fr/street-food-vietnamienne/montreuil/'),
  ('Elise & Pierre', array['Français', 'Bistrot', 'Café'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '10 Place de la Fraternité, 93100 Montreuil', '01 48 58 33 48', null),
  ('My Food Montreuil', array['Sud-Africain', 'Burger', 'Grillades'], null, '22 Rue Robespierre, 93100 Montreuil', '01 48 57 99 68', null),
  ('TOSCA RESTAURANT', array['Italien', 'Pizza', 'Pâtes', 'Escalope', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '202 Rue de Paris, 93100 Montreuil', '01 86 04 47 20', null),
  ('Rêv Café', array['Français', 'Café', 'Quiche', 'Soupe'], null, '54 ter Rue Robespierre, 93100 Montreuil', '07 69 19 68 06', null),
  ('Le Bérault', array['Français', 'Bistrot', 'Pâtes', 'Salade', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '94 Avenue de Paris, 94300 Vincennes', '01 43 74 96 22', 'https://www.leberault.fr/'),
  ('Chez Antoine', array['Italien', 'Pizza', 'Pâtes', 'Panini'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '2 Avenue de la République, 94300 Vincennes', '01 41 74 10 71', 'https://maison-chezantoine.fr/nos-restaurants/vincennes/'),
  ('Le Berlioz', array['Français', 'Bistrot', 'Burger', 'Grillades'], array['Sur Place', 'Bar', 'Option Végétarienne'], '8 Place Bérault, 94300 Vincennes', '01 41 93 10 33', 'https://leberliozvincennes.eatbu.com/'),
  ('Rahem Feuilles d''Automne', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Quiche'], array['À Emporter', 'Option Végétarienne'], '2 Avenue de la République, 94300 Vincennes', '01 43 28 53 76', null),
  ('Le Cerf', array['Français', 'Brasserie', 'Grillades', 'Burger', 'Tartare', 'Terrasse'], array['Sur Place', 'Bar', 'Option Végétarienne'], '96 Avenue de Paris, 94300 Vincennes', '01 43 28 01 42', 'https://www.brasserie-le-cerf.com/'),
  ('Hayaci', array['Japonais', 'Sushi', 'Yakitori', 'Chirashi'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '1 Place Bérault, 94300 Vincennes', '01 43 74 97 37', 'https://www.hayacisushi.com/'),
  ('Phô', array['Vietnamien', 'Phở', 'Bobun', 'Nems'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '3 Avenue de la République, 94300 Vincennes', '01 46 81 58 74', 'https://www.instagram.com/pho_vincennes/'),
  ('Adega', array['Portugais', 'Grillades', 'Poulet', 'Morue'], array['Sur Place', 'À Emporter'], '112 Rue Marceau, 93100 Montreuil', '01 42 87 26 09', null),
  ('Shishido Ramen', array['Japonais', 'Ramen', 'Donburi', 'Gyoza', 'Karaage'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '21 Avenue Georges Clemenceau, 94300 Vincennes', '01 41 74 61 18', null),
  ('Bao', array['Chinois', 'Bao', 'Dim Sum', 'Nouilles'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], null, null, null),
  ('Entre Midi et 2', array['Français', 'Sandwich', 'Quiche', 'Salade', 'Bagel'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '21 Avenue Georges Clemenceau, 94300 Vincennes', null, 'https://www.facebook.com/entremidietdeux2'),
  ('Pad Thai', array['Thaï', 'Pad Thaï', 'Curry', 'Bobun', 'Nouilles'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '11 Avenue Georges Clemenceau, 94300 Vincennes', '09 83 39 83 70', 'https://restaurant-padthai.fr/'),
  ('Yun Sushi', array['Japonais', 'Sushi', 'Yakitori', 'Chirashi', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '26 Rue des Laitières, 94300 Vincennes', '01 43 98 38 88', 'https://yunsushi.fr/'),
  ('Le Bouche à Oreille', array['Français', 'Bistrot', 'Viande', 'Poisson'], array['Sur Place', 'Bar', 'Option Végétarienne'], '26 Rue Georges Huchon, 94300 Vincennes', '01 43 91 72 57 / 06 85 22 69 20', 'https://www.le-bouche-a-oreille.fr/'),
  ('Le Pain d''Sam', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Quiche'], array['À Emporter', 'Option Végétarienne'], '46 Rue Massue, 94300 Vincennes', '07 83 01 56 32', 'https://lepaindsam.eatbu.com/'),
  ('L''Assiette Voyageuse', array['Français', 'Couscous'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '50 Rue de Lagny, 93100 Montreuil', '01 43 60 96 95', 'https://lassiette-voyageuse.eatbu.com/'),
  ('Maison Lecorvaisier', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Viennoiserie'], array['À Emporter'], '200 Rue de Fontenay, 94300 Vincennes', '01 41 93 08 98', null),
  ('Gaia Torréfacteur & Coffee Shop', array['Café', 'Coffee Shop', 'Pâtisserie', 'Terrasse'], array['Sur Place', 'À Emporter', 'Magasin', 'Option Végétarienne'], '135 Rue de Fontenay, 94300 Vincennes', null, null),
  ('Bar À Salade', array['Salade', 'Bowl'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '65 Avenue de Paris, 94160 Saint-Mandé', '01 45 97 24 74', null),
  ('Paasta Vincennes', array['Italien', 'Traiteur', 'Pâtes', 'Sandwich'], array['À Emporter', 'Magasin', 'Option Végétarienne'], '121 Rue de Fontenay, 94300 Vincennes', '06 42 23 38 97', 'https://paasta.fr/'),
  ('Alma Café', array['Café', 'Coffee Shop', 'Brunch', 'Grilled Cheese', 'Pâtisserie'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '37 Rue de Montreuil, 94300 Vincennes', '09 86 49 17 82', 'https://www.almacafevincennes.fr/'),
  ('L''Archipel', array['Français', 'Bistrot'], array['Sur Place', 'Bar'], '35 bis Rue de Montreuil, 94300 Vincennes', '06 78 01 28 75', null),
  ('Le Cocon', array['Français', 'Café', 'Brunch', 'Pâtisserie'], array['Sur Place', 'Option Végétarienne', 'Bar'], '39 Rue de Montreuil, 94300 Vincennes', '07 77 93 88 61', null),
  ('Chingu', array['Coréen', 'Bibimbap', 'Bulgogi', 'Poulet Frit', 'Tteokbokki'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '52 Avenue de Paris, 94300 Vincennes', '09 55 46 32 45', 'https://www.chingu.fr/'),
  ('La Maison Indienne by La Route Des Indes', array['Indien', 'Curry', 'Tandoori', 'Biryani', 'Naan', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '156 Avenue de Paris, 94300 Vincennes', '01 43 91 75 01', 'https://laroutedesindes.order.dish.co/'),
  ('Rio dos Camaraos', array['Africain', 'Camerounais', 'Mafé', 'Yassa', 'Grillades', 'Alloco', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '55 Rue Marceau, 93100 Montreuil', '01 42 87 34 84', null),
  ('Le Premier', array['Français', 'Bistrot', 'Tapas', 'Terrasse'], array['Sur Place', 'Bar', 'Option Végétarienne'], '160 Avenue de Paris, 94300 Vincennes', '09 61 03 83 51', 'https://lepremier-restaurant.com/'),
  ('Mon p''tit bistrot', array['Français', 'Bistrot'], array['Sur Place', 'Bar'], '101 Rue de Fontenay, 94300 Vincennes', null, null),
  ('Maison Levain', array['Boulangerie', 'Pâtisserie', 'Traiteur', 'Sandwich'], array['À Emporter'], '164 Avenue de Paris, 94300 Vincennes', '07 67 75 82 12', null),
  ('Miam Miam Libanais', array['Libanais', 'Mezzé', 'Falafel', 'Shawarma', 'Sandwich'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '18 Rue de Montreuil, 94300 Vincennes', '01 48 08 57 81', null),
  ('La Banquette', array['Français', 'Crêperie', 'Galette', 'Crêpe', 'Terrasse'], array['Sur Place', 'Option Végétarienne', 'Bar'], '2 Rue de la Prévoyance, 94300 Vincennes', '01 43 28 88 45', 'https://creperie-labanquette.fr/'),
  ('Maison Victoria', array['Café', 'Brunch', 'Pâtisserie'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '16 Rue de Montreuil, 94300 Vincennes', '06 95 34 02 38', null),
  ('El Gringo', array['Mexicain', 'Tex-Mex', 'Fajitas', 'Burrito', 'Tacos', 'Quesadilla', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '32 Avenue de Paris, 94300 Vincennes', '01 43 98 15 22', null),
  ('FEI FEI', array['Chinois', 'Nouilles', 'Raviolis'], array['Sur Place', 'À Emporter'], '17 Rue de l''Église, 94300 Vincennes', '07 59 66 16 86', null),
  ('Aux Papilles', array['Français', 'Traiteur', 'Charcuterie'], array['À Emporter', 'Magasin'], '36 Avenue Franklin Roosevelt, 94300 Vincennes', '01 43 28 13 24', null),
  ('CHENG THAI', array['Thaï', 'Pad Thaï', 'Curry'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '4 Rue Robert Giraudineau, 94300 Vincennes', '01 43 74 02 44', null),
  ('Ocho', array['Mexicain', 'Burrito', 'Tacos', 'Quesadilla', 'Bowl', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '1 Avenue du Château, 94300 Vincennes', '01 41 74 07 25', 'https://ochoresto.com/'),
  ('Renine', array['Italien', 'Pizza', 'Pâtes', 'Terrasse'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '33 Rue de Strasbourg, 94300 Vincennes', '01 41 74 64 15', 'https://www.renine.fr/'),
  ('m''poké', array['Hawaïen', 'Japonais', 'Poké Bowl'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '35-37 Avenue Joffre, 94160 Saint-Mandé', '07 61 49 82 72', null),
  ('AMATERRASSE', array['Japonais', 'Café', 'Pâtisserie', 'Thé'], array['Sur Place', 'À Emporter', 'Magasin', 'Option Végétarienne'], '86 Rue Raymond du Temple, 94300 Vincennes', '09 73 38 00 95', null),
  ('Le café sympa', array['Français', 'Café'], array['Sur Place', 'À Emporter'], '27 Rue Robespierre, 93100 Montreuil', null, null),
  ('Sakura', array['Japonais', 'Sushi', 'Sashimi', 'Yakitori', 'Chirashi', 'Dim Sum', 'Terrasse'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '46 Rue Raymond du Temple, 94300 Vincennes', '01 43 74 79 66', 'https://www.sakura-vincennes.fr/'),
  ('Les Pizzas d''Adrien - Camion Bleu', array['Italien', 'Pizza'], array['À Emporter', 'Option Végétarienne'], '2 Avenue du Général de Gaulle, 94160 Saint-Mandé', '06 52 52 54 74', null),
  ('Chez Gangnam', array['Coréen', 'Bibimbap', 'Bulgogi', 'Japchae', 'Poulet Frit'], array['Sur Place', 'À Emporter', 'Bar', 'Option Végétarienne'], '10 Avenue de Paris, 94300 Vincennes', '01 86 04 70 37', 'https://www.gangnam.fr/'),
  ('Sunny''s', array['Crêperie', 'Café', 'Sandwich', 'Salade', 'Hot-Dog', 'Pâtisserie'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '80 Rue de Fontenay, 94300 Vincennes', '09 73 69 95 53', null),
  ('L''Olivier du Kef', array['Tunisien', 'Méditerranéen', 'Couscous', 'Mezzé', 'Grillades', 'Terrasse'], array['Sur Place', 'Bar', 'Option Végétarienne'], '73 Rue de Strasbourg, 94300 Vincennes', '09 54 65 18 60', null),
  ('Chutney', array['Indien', 'Curry', 'Tandoori', 'Naan'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '22 Rue Edouard Vaillant, 93100 Montreuil', '01 80 89 06 22', null),
  ('Specho', array['Japonais', 'Ramen', 'Donburi', 'Gyoza', 'Karaage'], array['Sur Place', 'À Emporter', 'Option Végétarienne'], '49 Rue de Fontenay, 94300 Vincennes', '01 41 74 67 28', 'https://specho.fr/'),
  ('SUPER SMASH Montreuil', array['Américain', 'Burger', 'Smash Burger', 'Frites'], array['Sur Place', 'À Emporter'], '80 Rue de Paris, 93100 Montreuil', '01 55 86 05 17', null),
  ('Chicki Montreuil', array['Coréen', 'Poulet Frit', 'Wings', 'Corn Dog', 'Mandu'], array['Sur Place', 'À Emporter'], '8 Bis Place de la Fraternité, 93100 Montreuil', '06 52 68 11 24', 'https://www.chicki.fr/'),
  ('Brasserie Les Officiers', array['Français', 'Brasserie', 'Burger', 'Tartare', 'Grillades', 'Brunch', 'Terrasse'], array['Sur Place', 'Bar', 'Option Végétarienne'], '3 Avenue de Nogent, 94300 Vincennes', '01 43 28 25 10', 'https://lesofficiers.fr/');

-- Commerces alimentaires (2e CSV) : volontairement COMMENTÉS. Les décommenter
-- les ferait entrer dans la liste, la carte, la roulette et le choix du midi au
-- même titre que les restaurants. Leurs tags, eux, existent déjà en base.
-- insert into csv_import (name, tags, badges, address, phone, website) values
--   ('Carrefour City Vincennes Fontenay 143', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '143 Rue de Fontenay, 94300 Vincennes', '01 41 74 06 86', 'https://www.carrefour.fr/magasin/city-vincennes-fontenay-143'),
--   ('Carrefour City Vincennes Fontenay 134', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '134 Rue de Fontenay, 94300 Vincennes', '01 49 57 03 42', 'https://www.carrefour.fr/magasin/city-vincennes-fontenay-134'),
--   ('Carrefour City Vincennes Massue', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '31 Rue Massue, 94300 Vincennes', null, 'https://www.carrefour.fr/magasin/city-vincennes-massue'),
--   ('Franprix Vincennes', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '64 Avenue de Paris, 94300 Vincennes', '06 63 95 55 30', 'https://www.franprix.fr/'),
--   ('Naturalia Vincennes', array['Bio', 'Supermarché', 'Épicerie'], array['Magasin', 'TooGoodToGo'], '129/133 Rue de Fontenay, 94300 Vincennes', '01 48 08 55 16', 'https://magasins.naturalia.fr/naturalia/fr/store/france/ile-de-france/val-de-marne/vincennes/vincennes/3815'),
--   ('Naturalia Vincennes Château', array['Bio', 'Supermarché', 'Épicerie'], array['Magasin'], '4 Rue de Montreuil, 94300 Vincennes', '01 41 74 86 82', 'https://magasins.naturalia.fr/naturalia/fr/store/france/ile-de-france/val-de-marne/vincennes/vincennes-chateau/3918'),
--   ('La Vie Claire', array['Bio', 'Supérette', 'Épicerie'], array['Magasin'], '99 Rue de Fontenay, 94300 Vincennes', '01 46 81 11 35', 'https://magasins.lavieclaire.com/lavieclaire/fr/store/france/ile-de-france/val-de-marne/vincennes/vincennes-fontenay/19416'),
--   ('G20 Vincennes', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '25 Rue Raymond du Temple, 94300 Vincennes', '01 58 64 16 94', 'https://www.supermarchesg20.com/nos-magasins/supermarche-g20-52'),
--   ('Kmarket', array['Boucherie', 'Charcuterie', 'Épicerie'], array['Magasin'], '146 Avenue de Paris, 94300 Vincennes', '01 43 28 16 04', null),
--   ('Sothy2 Alimentation', array['Supermarché', 'Supérette', 'Épicerie'], array['Magasin'], '189 Rue de Fontenay, 94300 Vincennes', null, null),
--   ('Boucherie Chez Guillaume', array['Boucherie', 'Charcuterie'], array['Magasin'], '139 Rue de Fontenay, 94300 Vincennes', '01 43 28 02 99', null),
--   ('Ma Boucherie', array['Boucherie', 'Charcuterie'], array['Magasin'], '25 Rue de Montreuil, 94300 Vincennes', '01 43 28 10 94', 'https://maboucherie-vincennes.fr/'),
--   ('Boucherie Nouvelle', array['Boucherie', 'Charcuterie'], array['Magasin'], '26 Rue du Midi, 94300 Vincennes', '01 43 28 03 10', null),
--   ('Fromagerie Platini', array['Fromagerie', 'Fromage', 'Épicerie Fine'], array['Magasin'], '25 Rue de Montreuil, 94300 Vincennes', '01 43 74 94 25', 'https://fromagerie-platini.fr/'),
--   ('Primeur du Château', array['Primeur', 'Fruits', 'Légumes'], array['Magasin'], '140 Avenue de Paris, 94300 Vincennes', '06 67 94 55 14', null),
--   ('Le Panier de Vincennes', array['Primeur', 'Fruits', 'Légumes', 'Épicerie'], array['Magasin', 'À Emporter'], '19 Rue de l''Église, 94300 Vincennes', '09 55 24 00 64', null),
--   ('Poissonnerie du Midi', array['Poissonnerie', 'Poisson', 'Fruits de Mer'], array['Magasin'], '50 Rue du Midi, 94300 Vincennes', '01 43 28 49 48', null),
--   ('Les Produits de la Vie', array['Épicerie Fine'], array['Magasin'], '45 Avenue de Paris, 94300 Vincennes', '09 83 43 30 10', null),
--   ('Maison Tabiate', array['Épicerie Fine', 'Iranien', 'Thé', 'Fruits Secs', 'Épices'], array['Magasin'], '13 Avenue du Château, 94300 Vincennes', '01 43 28 71 31', null),
--   ('Comtesse du Barry', array['Épicerie Fine', 'Foie Gras', 'Terrine', 'Caviar', 'Truffe'], array['Magasin'], '34 Avenue du Château, 94300 Vincennes', '01 41 74 98 42', 'https://boutiques.comtessedubarry.com/34-comtesse-du-barry-vincennes'),
--   ('Aux Blés d''Or', array['Boulangerie', 'Pâtisserie', 'Sandwich'], array['Magasin', 'À Emporter'], '115 Rue de Fontenay, 94300 Vincennes', '09 79 30 98 81', null),
--   ('Délices de Vincennes', array['Boulangerie', 'Pâtisserie', 'Sandwich', 'Traiteur'], array['Magasin', 'À Emporter'], '29 Avenue de la République, 94300 Vincennes', null, null),
--   ('Le Jardin de Jasmine', array['Boulangerie', 'Pâtisserie'], array['Magasin', 'À Emporter'], '196 Rue de Fontenay, 94300 Vincennes', '01 46 80 37 85', null),
--   ('Laurent Duchêne Vincennes', array['Pâtisserie', 'Chocolat', 'Macaron', 'Viennoiserie', 'Traiteur'], array['Magasin', 'À Emporter'], '45 Rue Raymond du Temple, 94300 Vincennes', '01 46 81 07 58', 'https://www.laurentduchene.com/boutiques/'),
--   ('Yann Couvreur Vincennes', array['Pâtisserie', 'Viennoiserie', 'Chocolat'], array['Magasin', 'À Emporter'], '87 Rue de Fontenay, 94300 Vincennes', null, 'https://www.yanncouvreur.com/pages/boutiques'),
--   ('Casa Cecchi II', array['Italien', 'Traiteur', 'Épicerie Fine'], array['Magasin', 'À Emporter'], '36 Rue du Midi, 94300 Vincennes', '09 84 24 69 09', null),
--   ('Quilles & Coquilles', array['Poisson', 'Fruits de Mer', 'Huîtres', 'Épicerie Fine'], array['Sur Place', 'À Emporter', 'Bar', 'Magasin'], '6 Rue Defrance, 94300 Vincennes', '09 77 91 40 16', 'https://www.quillesetcoquilles.com/');

-- 3) Rapprochement puis import -------------------------------------------------
do $$
declare
  rec        record;
  found_id   bigint;
  base       text;
  candidate  text;
  i          int;
  n_updated  int := 0;
  n_created  int := 0;
begin
  for rec in select * from csv_import order by name loop
    select r.id into found_id
    from public.restaurants r
    where public.norm_name(r.name) = public.norm_name(rec.name)
    limit 1;

    if found_id is not null then
      update public.restaurants r
      set tags    = coalesce(rec.tags, r.tags),
          badges  = coalesce(rec.badges, r.badges),
          phone   = coalesce(rec.phone, r.phone),
          website = coalesce(rec.website, r.website),
          -- L'adresse du CSV fait foi. `lat`/`lng` ne bougent PAS : le pin a
          -- été placé à la main et reste ce qui fait autorité sur la carte.
          -- La plupart des écarts ne sont que de la mise en forme ; le contrôle
          -- « adresses modifiées » (à la fin) les liste toutes grâce à la
          -- sauvegarde, pour re-placer le pin si une adresse a vraiment changé.
          address = coalesce(rec.address, r.address)
      where r.id = found_id;
      n_updated := n_updated + 1;
    else
      base := public.slugify_fr(rec.name);
      candidate := base;
      i := 1;
      while exists (select 1 from public.restaurants where slug = candidate) loop
        i := i + 1;
        candidate := base || '-' || i;
      end loop;

      insert into public.restaurants (name, slug, tags, badges, address, phone, website)
      values (rec.name, candidate, rec.tags, rec.badges, rec.address, rec.phone, rec.website);
      n_created := n_created + 1;
    end if;
  end loop;

  raise notice 'Restaurants mis à jour : % — créés : %', n_updated, n_created;
end;
$$;

-- 4) Filet de sécurité : aucun tag absent de la table `tags` -------------------
-- (même règle que le trigger de suppression : la table `tags` fait foi)
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

-- 5) Distances et scores -------------------------------------------------------
-- Sans effet sur les nouveaux tant que le géocodage n'a pas tourné : c'est
-- normal, on relance ces deux lignes après `backfill-coords.mjs` (cf. en-tête).
select public.refresh_distances() as distances_calculees;
select public.recalc_relevance();

-- Contrôles — les 2 premiers utilisent `csv_import`, donc AVANT de fermer
-- l'onglet SQL (la table temporaire meurt avec la session) :
--   -- adresses du CSV qui DIFFÈRENT de celles déjà en base (non modifiées) :
--   select r.name, r.address as en_base, c.address as csv
--   from public.restaurants r join csv_import c
--     on public.norm_name(r.name) = public.norm_name(c.name)
--   where nullif(btrim(r.address), '') is not null
--     and public.norm_name(r.address) is distinct from public.norm_name(c.address);
--
--   -- lignes du CSV créées (et non rapprochées) :
--   select c.name from csv_import c
--   join public.restaurants r on public.norm_name(r.name) = public.norm_name(c.name)
--   where r.lat is null order by 1;
--
--   -- ce qui reste à compléter : coordonnées manquantes
--   select name, address from public.restaurants
--   where lat is null or lng is null order by name;
--
--   -- état du pipeline distance / temps de marche :
--   select
--     count(*) filter (where lat is null)                             as sans_coords,
--     count(*) filter (where lat is not null and distance is null)    as sans_distance,
--     count(*) filter (where lat is not null and walk_minutes is null) as sans_marche
--   from public.restaurants;
--
--   -- badges inconnus de la table `badges` (aucune icône affichée) :
--   select distinct b from public.restaurants r, unnest(r.badges) b
--   where not exists (select 1 from public.badges x where x.label = b);
--
--   -- doublons de nom éventuels :
--   select public.norm_name(name), count(*), array_agg(slug)
--   from public.restaurants group by 1 having count(*) > 1;

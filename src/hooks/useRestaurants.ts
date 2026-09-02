export type Restaurant = {
  id: number;
  name: string;
  slug: string;
  image: string;
  distance: string;
  distanceLabel: string;
  rating: number | null;
  tags: string[];
  badges: string[];
  reviews: number;
  address: string;
  phone: string;
  website: string;
  lat: number | null;
  lng: number | null;
  walk_minutes: number | null;
  /** Restaurant définitivement fermé : gardé pour l'historique, relégué en bas. */
  closed: boolean;
  /** Autorise les nouveaux avis / photos / menus (le contenu existant reste). */
  contributions_enabled: boolean;
};

import useSupabaseQuery from "./useSupabaseQuery";
import { slugify } from "../utils/slugify";
import supabaseClient from "../services/supabaseClient";
import useIsAdmin from "./useIsAdmin";
import useSession from "./useSession";
import { RestaurantFilters, defaultRestaurantFilters } from "../pages/UserPage";

const useRestaurants = (restaurantFilters: RestaurantFilters) => {
  const { id, slug, sortOrder, minRate, tags, badges, searchText } =
    restaurantFilters;
  const isAdmin = useIsAdmin();
  // La clé contient `isAdmin` : tant que la session n'est pas lue on ne lance
  // rien, sinon on paierait une requête « non-admin » aussitôt remplacée.
  const { loading: sessionLoading } = useSession();

  const buildQuery = () => {
    let query = supabaseClient.from("restaurants").select();

    // Le restaurant de test (slug "test") n'est visible/accessible que par les
    // admins — masqué de la grille ET de l'accès direct à la fiche.
    if (!isAdmin) {
      query = query.neq("slug", "test");
    }

    if (id) {
      query = query.eq("id", id);
    } else if (slug) {
      query = query.eq("slug", slug);
    } else {
      if (minRate > 0) {
        query = query.gte("rating", minRate);
      }

      if (tags.length > 0) {
        query = query.overlaps("tags", tags);
      }

      if (badges.length > 0) {
        query = query.contains("badges", badges);
      }

      if (searchText !== "") {
        const slugifiedSearchText = slugify(searchText);
        query = query.or(
          `name.ilike.%${slugifiedSearchText}%,slug.ilike.%${slugifiedSearchText}%`
        );
      }
    }

    const asc = sortOrder === "distance";
    // Les fermés restent consultables mais passent toujours en fin de liste,
    // quel que soit le tri choisi (false avant true en ordre croissant).
    const ordered = query
      .order("closed", { ascending: true })
      .order(sortOrder, { ascending: asc });

    // À note égale, le plus commenté passe devant (un 4,5 sur 20 avis vaut
    // mieux qu'un 4,5 sur 1 avis), puis la pertinence tranche.
    if (sortOrder === "rating") {
      return ordered
        .order("reviews", { ascending: false })
        .order("relevance", { ascending: false });
    }
    return ordered;
  };

  // `favoritesOnly` est appliqué côté client (RestaurantGrid) : l'exclure de la
  // clé évite de refaire la même requête en cochant/décochant les favoris.
  const queryKey = [
    "restaurants",
    { id, slug, sortOrder, minRate, tags, badges, searchText },
    isAdmin,
  ];

  // Liste sans aucun filtre : c'est celle qu'on retrouve en vidant la recherche
  // ou en revenant sur l'onglet. Chargée une fois à la connexion (cf.
  // RestaurantsPrefetch), elle reste en cache pour toute la session ; seules
  // les invalidations explicites de ["restaurants"] la rafraîchissent.
  const isDefaultList =
    !id &&
    !slug &&
    sortOrder === defaultRestaurantFilters.sortOrder &&
    minRate === defaultRestaurantFilters.minRate &&
    tags.length === 0 &&
    badges.length === 0 &&
    searchText === "";

  return useSupabaseQuery<Restaurant>(queryKey, buildQuery, {
    enabled: !sessionLoading,
    ...(isDefaultList ? { staleTime: Infinity, gcTime: Infinity } : {}),
  });
};

export default useRestaurants;

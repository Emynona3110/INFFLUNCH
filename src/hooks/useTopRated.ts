import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

/** Nombre d'avis minimum pour monter sur le podium : 3, pour qu'un unique avis
 *  enthousiaste ne suffise plus à placer un resto en tête. */
const MIN_REVIEWS = 3;

/** Taille du podium : or, argent, bronze. */
const PODIUM = 3;

/**
 * Le podium des mieux notés — pastille « Top 1 / 2 / 3 » et anneau sur la card.
 * La liste revient CLASSÉE : le rang d'un restaurant, c'est son index (voir
 * `topRankOf`).
 *
 * Classement sur la note BRUTE, dans l'ordre : note, puis nombre d'avis (à note
 * égale, le plus commenté est le mieux établi), puis la distance (le plus près
 * l'emporte), puis le nom pour que l'ordre soit stable d'un chargement à
 * l'autre. Les restos sans distance connue passent en dernier (NULLS LAST).
 *
 * Éligibilité : au moins MIN_REVIEWS avis (3) ; les autres n'y figurent pas,
 * quelle que soit leur note. Le
 * resto de test et les fermés sont exclus quel que soit le rôle.
 */
const useTopRated = () =>
  useSupabaseQuery<{ id: number }>(["restaurants", "topRated"], () =>
    supabaseClient
      .from("restaurants")
      .select("id")
      .gte("reviews", MIN_REVIEWS)
      .neq("slug", "test")
      .eq("closed", false)
      .order("rating", { ascending: false })
      .order("reviews", { ascending: false })
      .order("distance", { ascending: true })
      .order("name", { ascending: true })
      .limit(PODIUM)
  );

export default useTopRated;

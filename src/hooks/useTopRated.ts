import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

/** Nombre d'avis minimum pour monter sur le podium : éligible dès le premier
 *  avis (choix assumé — un resto noté une fois peut donc être en tête). À
 *  monter si un unique avis enthousiaste fausse trop le classement. */
const MIN_REVIEWS = 1;

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
 * Éligibilité : au moins MIN_REVIEWS avis (1 aujourd'hui, donc tout resto noté
 * concourt ; seuls ceux sans aucun avis sont écartés, leur note valant 0). Le
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

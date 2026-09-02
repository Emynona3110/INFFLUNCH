import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

/** Nombre d'avis minimum pour prétendre au Top 5 : éligible dès le premier avis
 *  (choix assumé — un resto noté une fois peut donc être en tête). À monter si
 *  un unique avis enthousiaste fausse trop le classement. */
const MIN_REVIEWS = 1;

/**
 * Les 5 restaurants les mieux notés (pastille « Top 5 » + anneau sur la card).
 *
 * Classement sur la note BRUTE, dans l'ordre : note, puis nombre d'avis (à note
 * égale, le plus commenté est le mieux établi), puis note bayésienne (elle
 * départage deux restos de même note et même nombre d'avis en tenant compte du
 * prior), puis le nom pour que l'ordre soit stable d'un chargement à l'autre.
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
      .order("bayes_rating", { ascending: false })
      .order("name", { ascending: true })
      .limit(5)
  );

export default useTopRated;

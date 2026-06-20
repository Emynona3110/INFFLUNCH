import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

const useTopRated = () =>
  useSupabaseQuery<{ id: number }>(["restaurants", "topRated"], () =>
    supabaseClient
      .from("restaurants")
      .select("id")
      // Tri sur la note bayésienne (corrigée du faible nb d'avis) et non la note
      // brute : un 5,0 avec 1 avis ne passe plus devant un 4,5 avec 50 avis.
      .order("bayes_rating", { ascending: false })
      .neq("reviews", 0)
      // Le resto de test n'est jamais Top 3, quel que soit le rôle.
      .neq("slug", "test")
      .limit(3)
  );

export default useTopRated;

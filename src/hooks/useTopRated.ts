import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

const useTopRated = () =>
  useSupabaseQuery<{ id: number }>(["restaurants", "topRated"], () =>
    supabaseClient
      .from("restaurants")
      .select("id")
      .order("rating", { ascending: false })
      .neq("reviews", 0)
      // Le resto de test n'est jamais Top 3, quel que soit le rôle.
      .neq("slug", "test")
      .limit(3)
  );

export default useTopRated;

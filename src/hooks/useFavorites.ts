import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";

interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: number;
  created_at: string;
}

const useFavorites = () => {
  const { sessionData, loading: sessionLoading } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["favorites", userId];

  const {
    data: favorites = [],
    isPending,
    error,
  } = useQuery<Favorite[], Error>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("favorites")
        .select("*")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
  };

  const addMutation = useMutation({
    mutationFn: async (restaurantId: number) => {
      const { error } = await supabaseClient
        .from("favorites")
        .insert({ user_id: userId, restaurant_id: restaurantId });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (restaurantId: number) => {
      const { error } = await supabaseClient
        .from("favorites")
        .delete()
        .match({ user_id: userId, restaurant_id: restaurantId });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    favorites,
    restaurantIds: favorites.map((f) => f.restaurant_id),
    // Reste "loading" tant que la session n'est pas résolue OU que la requête
    // favoris est en cours : évite d'afficher les cartes (cœurs vides) avant que
    // les favoris ne soient connus, juste après le login.
    loading: sessionLoading || (!!userId && isPending),
    error: error ? error.message : null,
    addFavorite: addMutation.mutateAsync,
    removeFavorite: removeMutation.mutateAsync,
  };
};

export default useFavorites;

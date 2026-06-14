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
  const { sessionData } = useSession();
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

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
    loading: !!userId && isPending,
    error: error ? error.message : null,
    addFavorite: addMutation.mutateAsync,
    removeFavorite: removeMutation.mutateAsync,
  };
};

export default useFavorites;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import {
  OptimisticContext,
  patchQueries,
  rollbackQueries,
  settleWhenIdle,
} from "../lib/optimistic";

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

  // Écritures optimistes (src/lib/optimistic.ts) : le cœur et le filtre
  // « Favoris » changent au clic ; ajouts et retraits passent dans l'ordre.
  const writes = {
    mutationKey: ["favorites-write"],
    scope: { id: "favorites-write" },
    onError: (_e: Error, _id: number, context?: OptimisticContext) =>
      rollbackQueries(queryClient, context),
    onSettled: () =>
      settleWhenIdle(queryClient, ["favorites-write"], invalidate),
  };

  const addMutation = useMutation({
    ...writes,
    mutationFn: async (restaurantId: number) => {
      const { error } = await supabaseClient
        .from("favorites")
        .insert({ user_id: userId, restaurant_id: restaurantId });
      // Déjà en favori (double clic rattrapé par la file) : rien à signaler.
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    onMutate: (restaurantId: number) =>
      patchQueries(queryClient, [
        [
          queryKey,
          (prev: Favorite[]) =>
            prev.some((f) => f.restaurant_id === restaurantId)
              ? prev
              : [
                  ...prev,
                  {
                    id: `optimistic-${restaurantId}`,
                    user_id: userId as string,
                    restaurant_id: restaurantId,
                    created_at: new Date().toISOString(),
                  },
                ],
        ],
      ]),
  });

  const removeMutation = useMutation({
    ...writes,
    mutationFn: async (restaurantId: number) => {
      const { error } = await supabaseClient
        .from("favorites")
        .delete()
        .match({ user_id: userId, restaurant_id: restaurantId });
      if (error) throw new Error(error.message);
    },
    onMutate: (restaurantId: number) =>
      patchQueries(queryClient, [
        [
          queryKey,
          (prev: Favorite[]) =>
            prev.filter((f) => f.restaurant_id !== restaurantId),
        ],
      ]),
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

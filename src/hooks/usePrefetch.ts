import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { reviewsQueryOptions } from "./useReviews";
import { restaurantPhotosQueryOptions } from "./useRestaurantPhotos";
import { restaurantMenusQueryOptions } from "./useRestaurantMenus";
import { lunchTodayQueryOptions, parisDay } from "./useLunchToday";
import { leaderboardQueryOptions, parisMonthKey } from "./useLeaderboard";

/**
 * Préchargement à l'intention (survol souris, début de toucher) : les données
 * de la page visée partent avant le clic, elle s'ouvre alors sans attente.
 * `prefetchQuery` ne refait rien tant que le cache est frais (staleTime), on
 * peut donc l'appeler à chaque survol sans multiplier les requêtes.
 */
const usePrefetch = () => {
  const queryClient = useQueryClient();

  /** Fiche resto : avis, photos, menus (le resto lui-même vient de la liste). */
  const prefetchRestaurant = useCallback(
    (restaurantId: number) => {
      queryClient.prefetchQuery(reviewsQueryOptions(restaurantId));
      queryClient.prefetchQuery(restaurantPhotosQueryOptions(restaurantId));
      queryClient.prefetchQuery(restaurantMenusQueryOptions(restaurantId));
    },
    [queryClient],
  );

  /** Onglet de la navbar (chemin de la section). */
  const prefetchSection = useCallback(
    (path: string) => {
      if (path === "dejeuner")
        queryClient.prefetchQuery(lunchTodayQueryOptions(parisDay()));
      // Classement : la période ouverte par défaut (le mois en cours).
      if (path === "classement")
        queryClient.prefetchQuery(leaderboardQueryOptions(parisMonthKey()));
    },
    [queryClient],
  );

  return { prefetchRestaurant, prefetchSection };
};

export default usePrefetch;

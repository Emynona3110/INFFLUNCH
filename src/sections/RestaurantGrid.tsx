import { motion } from "framer-motion";
import { RestaurantFilters } from "../pages/UserPage";
import useRestaurants from "../hooks/useRestaurants";
import useTopRated from "../hooks/useTopRated";
import useFavorites from "../hooks/useFavorites";
import RestaurantCardTW from "@/components/RestaurantCardTW";

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
}

const CardSkeleton = () => (
  <div className="overflow-hidden rounded-card border border-border bg-card">
    <div className="h-48 w-full animate-pulse bg-foreground/10" />
    <div className="space-y-3 p-5">
      <div className="h-6 w-2/3 animate-pulse rounded bg-foreground/10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-foreground/10" />
      <div className="flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-foreground/10" />
      </div>
    </div>
  </div>
);

const RestaurantGrid = ({ restaurantFilters }: RestaurantGridProps) => {
  const { data, error, loading } = useRestaurants(restaurantFilters);
  const topRatedResult = useTopRated();
  const {
    restaurantIds: favoriteIds,
    loading: favoritesLoading,
    addFavorite,
    removeFavorite,
  } = useFavorites();

  const topRated = !topRatedResult.error
    ? (topRatedResult.data as { id: number }[])
    : [];

  const filteredData = restaurantFilters.favoritesOnly
    ? data.filter((r) => favoriteIds.includes(r.id))
    : data;

  const isLoading = loading || favoritesLoading;

  // Change quand un filtre change (favoris/tags/badges/note/tri) mais PAS à la
  // frappe de recherche → remonte la grille pour ré-animer toutes les cartes.
  const gridKey = JSON.stringify({
    sortOrder: restaurantFilters.sortOrder,
    minRate: restaurantFilters.minRate,
    tags: restaurantFilters.tags,
    badges: restaurantFilters.badges,
    favoritesOnly: restaurantFilters.favoritesOnly,
  });

  return (
    <div className="tw-scope min-h-[60vh]">
      <div>
        {error ? (
          <p className="py-10 text-center text-destructive">Erreur : {error}</p>
        ) : !isLoading && filteredData.length === 0 ? (
          <p className="py-10 text-center text-foreground/70">
            {restaurantFilters.favoritesOnly
              ? "Aucun restaurant ne fait partie de vos favoris."
              : "Aucun restaurant ne correspond à votre recherche."}
          </p>
        ) : (
          <div
            key={gridKey}
            className="grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
          >
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={`s-${i}`}>
                    <CardSkeleton />
                  </div>
                ))
              : filteredData.map((restaurant, i) => {
                  const featured = topRated.some((t) => t.id === restaurant.id);
                  return (
                    <motion.div
                      key={restaurant.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
                    >
                      <RestaurantCardTW
                        restaurant={restaurant}
                        topRated={topRated}
                        featured={featured}
                        liked={favoriteIds.includes(restaurant.id)}
                        onLikeToggle={async (liked) => {
                          if (liked) await addFavorite(restaurant.id);
                          else await removeFavorite(restaurant.id);
                        }}
                      />
                    </motion.div>
                  );
                })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantGrid;

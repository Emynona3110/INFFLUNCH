import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { RestaurantFilters, ViewMode } from "../pages/UserPage";
import useRestaurants, { Restaurant } from "../hooks/useRestaurants";
import useTopRated from "../hooks/useTopRated";
import useFavorites from "../hooks/useFavorites";
import useIsAdmin from "../hooks/useIsAdmin";
import RestaurantCardTW from "@/components/RestaurantCardTW";
import RestaurantRow from "@/components/RestaurantRow";
import RestaurantsMap from "@/components/RestaurantsMap";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
  viewMode: ViewMode;
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

const RowSkeleton = () => (
  <div className="flex items-center gap-4 rounded-card border border-border bg-card p-3">
    <div className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-foreground/10 sm:h-20 sm:w-28" />
    <div className="flex-1 space-y-2">
      <div className="h-5 w-1/3 animate-pulse rounded bg-foreground/10" />
      <div className="h-4 w-1/4 animate-pulse rounded bg-foreground/10" />
      <div className="flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-foreground/10" />
      </div>
    </div>
  </div>
);

const RestaurantGrid = ({ restaurantFilters, viewMode }: RestaurantGridProps) => {
  const { data, error, loading } = useRestaurants(restaurantFilters);
  const topRatedResult = useTopRated();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<Restaurant | null>(null);
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
  // frappe de recherche → remonte la liste pour ré-animer tous les éléments.
  const listKey = JSON.stringify({
    sortOrder: restaurantFilters.sortOrder,
    minRate: restaurantFilters.minRate,
    tags: restaurantFilters.tags,
    badges: restaurantFilters.badges,
    favoritesOnly: restaurantFilters.favoritesOnly,
    viewMode,
  });

  // Props communs aux cards/rows.
  const itemProps = (restaurant: Restaurant) => ({
    restaurant,
    topRated,
    featured: topRated.some((t) => t.id === restaurant.id),
    liked: favoriteIds.includes(restaurant.id),
    onLikeToggle: async (liked: boolean) => {
      if (liked) await addFavorite(restaurant.id);
      else await removeFavorite(restaurant.id);
    },
    onEdit: isAdmin ? () => setEditTarget(restaurant) : undefined,
  });

  const emptyMessage = restaurantFilters.favoritesOnly
    ? "Aucun restaurant ne fait partie de vos favoris."
    : "Aucun restaurant ne correspond à votre recherche.";

  const renderContent = () => {
    if (error) {
      return <p className="py-10 text-center text-destructive">Erreur : {error}</p>;
    }
    if (!isLoading && filteredData.length === 0) {
      return <p className="py-10 text-center text-foreground/70">{emptyMessage}</p>;
    }

    // --- Carte globale ---
    if (viewMode === "map") {
      if (isLoading) {
        return (
          <div className="flex h-full items-center justify-center rounded-card border border-border bg-muted/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        );
      }
      return <RestaurantsMap restaurants={filteredData} />;
    }

    // --- Liste ---
    if (viewMode === "list") {
      return (
        <div key={listKey} className="flex flex-col gap-3">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <RowSkeleton key={`s-${i}`} />)
            : filteredData.map((restaurant, i) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <RestaurantRow {...itemProps(restaurant)} />
                </motion.div>
              ))}
        </div>
      );
    }

    // --- Grille (défaut, inchangée) ---
    return (
      <div
        key={listKey}
        className="grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={`s-${i}`}>
                <CardSkeleton />
              </div>
            ))
          : filteredData.map((restaurant, i) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
              >
                <RestaurantCardTW {...itemProps(restaurant)} />
              </motion.div>
            ))}
      </div>
    );
  };

  return (
    <div className={viewMode === "map" ? "tw-scope h-full" : "tw-scope min-h-[60vh]"}>
      {renderContent()}

      {isAdmin && (
        <RestaurantDialog
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            queryClient.invalidateQueries();
          }}
          initialData={editTarget ?? undefined}
        />
      )}
    </div>
  );
};

export default RestaurantGrid;

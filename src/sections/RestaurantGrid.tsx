import { cn } from "@/lib/utils";
import { SECTION_BODY } from "@/lib/sectionClasses";
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
import RestaurantRoulette from "@/components/RestaurantRoulette";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";
import ChefHatPlus from "@/components/icons/ChefHatPlus";
import { FiArrowUpRight, FiChevronDown } from "react-icons/fi";

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
  viewMode: ViewMode;
  /** Restos exclus de la roue (mémorisés au niveau page). */
  rouletteExcluded: Set<number>;
  onRouletteExcludedChange: (next: Set<number>) => void;
  /** Dernier resto tiré, mémorisé au niveau page (persiste au changement de vue). */
  rouletteWinnerId: number | null;
  onRouletteWinnerChange: (id: number | null) => void;
}

/** Cartes visibles dès l'ouverture (2 rangées de 3 au plus large) : leurs
 *  images partent tout de suite, les suivantes à l'approche du scroll. */
const PRIORITY_ITEMS = 6;

/** Grille et liste : résultats affichés par tranches. Les données arrivent en
 *  une fois (légères, et la carte, la roue, le tri en ont besoin entières) ;
 *  ce sont les cartes et leurs photos qu'on ne construit qu'à la demande. */
const PAGE_SIZE = 12;

/** Tranches déjà dépliées, pour les mêmes filtres : survit au passage par une
 *  fiche resto (retour sur la grille au même endroit), pas au rechargement. */
let rememberedShown = { key: "", count: PAGE_SIZE };

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
  <div className="flex items-center gap-4 p-2 sm:rounded-card sm:border sm:border-border sm:bg-card sm:p-3">
    <div className="hidden h-20 w-28 shrink-0 animate-pulse rounded-lg bg-foreground/10 sm:block" />
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

const RestaurantGrid = ({
  restaurantFilters,
  viewMode,
  rouletteExcluded,
  onRouletteExcludedChange,
  rouletteWinnerId,
  onRouletteWinnerChange,
}: RestaurantGridProps) => {
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

  // Nombre de résultats affichés : remis à une tranche dès que les filtres ou
  // la recherche changent.
  const shownKey = JSON.stringify([
    listKey,
    restaurantFilters.searchText,
    restaurantFilters.priceRange,
  ]);
  const [shown, setShown] = useState(() =>
    rememberedShown.key === shownKey
      ? rememberedShown
      : { key: shownKey, count: PAGE_SIZE },
  );
  const shownCount = shown.key === shownKey ? shown.count : PAGE_SIZE;
  if (shown.key !== shownKey) setShown({ key: shownKey, count: PAGE_SIZE });
  rememberedShown = { key: shownKey, count: shownCount };
  const visibleData = filteredData.slice(0, shownCount);
  const remaining = filteredData.length - visibleData.length;

  // Lien discret plutôt qu'un bouton : texte grisé encadré de deux flèches.
  const showMore = remaining > 0 && (
    <div className="mt-4 flex justify-center sm:mt-6">
      <button
        type="button"
        onClick={() =>
          setShown({ key: shownKey, count: shownCount + PAGE_SIZE })
        }
        className="inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-foreground/50 transition hover:text-foreground/80"
      >
        <FiChevronDown className="h-4 w-4" aria-hidden />
        Afficher plus
        <FiChevronDown className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );

  // Props communs aux cards/rows.
  const itemProps = (restaurant: Restaurant) => ({
    restaurant,
    topRated,
    liked: favoriteIds.includes(restaurant.id),
    onLikeToggle: async (liked: boolean) => {
      if (liked) await addFavorite(restaurant.id);
      else await removeFavorite(restaurant.id);
    },
    onEdit: isAdmin ? () => setEditTarget(restaurant) : undefined,
  });

  // Le message « aucun favori » ne vaut que si la liste de favoris est vraiment
  // vide : avec des favoris et une recherche qui ne donne rien, c'est bien la
  // recherche (ou les filtres) qui n'aboutit pas.
  const noFavorites = !!restaurantFilters.favoritesOnly && favoriteIds.length === 0;
  const emptyMessage = noFavorites
    ? "Aucun restaurant ne fait partie de vos favoris."
    : "Aucun restaurant ne correspond à votre recherche.";

  const renderContent = () => {
    if (error) {
      return (
        <p className="py-10 text-center text-destructive">Erreur : {error}</p>
      );
    }
    if (!isLoading && filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="m-0 text-foreground/70">{emptyMessage}</p>
          {/* Recherche infructueuse : on montre où ajouter le resto, comme
              « Mes demandes » montre la bulle de la navbar. */}
          {!noFavorites && (
            <p className="m-0 text-sm text-foreground/55">
              {isAdmin ? "Ajoute-le" : "Pas trouvé ? Propose-le"} en cliquant sur{" "}
              <ChefHatPlus className="inline h-4 w-4 align-text-bottom text-primary" />
              {/* La flèche dit où le trouver : en haut à droite, dans la barre. */}
              <FiArrowUpRight className="inline h-4 w-4 align-text-bottom text-foreground opacity-40" />
            </p>
          )}
        </div>
      );
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
      // Les restaurants fermés ne sont pas placés sur la carte.
      return (
        <RestaurantsMap restaurants={filteredData.filter((r) => !r.closed)} />
      );
    }

    // --- Roue (Surprise du midi) ---
    if (viewMode === "roulette") {
      if (isLoading) {
        return (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        );
      }
      return (
        <RestaurantRoulette
          pool={filteredData.filter((r) => !r.closed)}
          excludedIds={rouletteExcluded}
          onExcludedChange={onRouletteExcludedChange}
          winnerId={rouletteWinnerId}
          onWinnerChange={onRouletteWinnerChange}
          cardProps={itemProps}
        />
      );
    }

    // --- Liste ---
    if (viewMode === "list") {
      return (
        /* Mobile : lignes empilées dans un cadre de section (filets) ; desktop :
           tuiles espacées. */
        <>
          <div
            key={listKey}
            className={cn(
              SECTION_BODY,
              "divide-y divide-border sm:flex sm:flex-col sm:gap-3 sm:divide-y-0",
            )}
          >
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <RowSkeleton key={`s-${i}`} />
                ))
              : visibleData.map((restaurant, i) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    // Cascade comptée dans la tranche : la suivante démarre aussitôt.
                    transition={{
                      duration: 0.25,
                      delay: Math.min((i % PAGE_SIZE) * 0.02, 0.12),
                    }}
                  >
                    <RestaurantRow
                      {...itemProps(restaurant)}
                      priority={i < PRIORITY_ITEMS}
                    />
                  </motion.div>
                ))}
          </div>
          {!isLoading && showMore}
        </>
      );
    }

    // --- Grille (défaut, inchangée) ---
    return (
      <>
        <div
          key={listKey}
          className="grid grid-flow-dense grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
        >
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={`s-${i}`}>
                  <CardSkeleton />
                </div>
              ))
            : visibleData.map((restaurant, i) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min((i % PAGE_SIZE) * 0.03, 0.15),
                  }}
                >
                  <RestaurantCardTW
                    {...itemProps(restaurant)}
                    priority={i < PRIORITY_ITEMS}
                  />
                </motion.div>
              ))}
        </div>
        {!isLoading && showMore}
      </>
    );
  };

  return (
    <div
      className={
        viewMode === "map" || viewMode === "roulette"
          ? "tw-scope h-full"
          : "tw-scope min-h-[60vh]"
      }
    >
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

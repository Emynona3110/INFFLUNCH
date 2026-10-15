import { cn } from "@/lib/utils";
import { SECTION_BODY } from "@/lib/sectionClasses";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { RestaurantFilters, ViewMode } from "../pages/UserPage";
import useRestaurants, { Restaurant } from "../hooks/useRestaurants";
import useTopRated from "../hooks/useTopRated";
import useFavorites from "../hooks/useFavorites";
import useIsAdmin from "../hooks/useIsAdmin";
import RestaurantCardTW from "@/components/RestaurantCardTW";
import RestaurantRow from "@/components/RestaurantRow";
import { LazyRestaurantDialog } from "@/components/lazyDialogs";
import { lazyPage, useOpenedOnce } from "@/lib/lazyPage";
import ChefHatPlus from "@/components/icons/ChefHatPlus";
import { FiArrowUpRight, FiChevronDown } from "react-icons/fi";
import PageLoader from "@/components/brand/PageLoader";
import { useScreenLoader } from "@/components/brand/ScreenLoader";

// Attente des vues Carte et Roue (données ou code pas encore là).
const mapLoader = (
  <div className="flex h-full items-center justify-center rounded-card border border-border bg-muted/40">
    <PageLoader />
  </div>
);
const rouletteLoader = (
  <div className="flex h-full items-center justify-center">
    <PageLoader />
  </div>
);

// Carte (Leaflet) et roue : chargées à part, préchargées en tâche de fond.
const RestaurantsMap = lazyPage(() => import("@/components/RestaurantsMap"));
const RestaurantRoulette = lazyPage(() => import("@/components/RestaurantRoulette"));

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

/** Mêmes dimensions que RestaurantCardTW, mobile (image 128 px, corps
 *  serré) comme desktop (image 192 px) : la grille ne saute pas à l'arrivée
 *  des données. */

/** Mêmes dimensions que RestaurantRow : sur mobile, ni vignette ni tags. */

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
  const editOpened = useOpenedOnce(!!editTarget);
  useEffect(() => {
    if (isAdmin) void LazyRestaurantDialog.preload();
  }, [isAdmin]);
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
  // Carte et roue ont leur propre attente (dans leur cadre).
  const waiting = useScreenLoader(
    isLoading && viewMode !== "map" && viewMode !== "roulette",
  );

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

  // Arrivée en cascade, comptée dans la tranche : la suivante (« voir plus »)
  // démarre aussitôt.
  const enter = (i: number, y: number, step: number, max: number) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.35,
      delay: Math.min((i % PAGE_SIZE) * step, max),
    },
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
    if (!isLoading && !waiting && filteredData.length === 0) {
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
      if (isLoading) return mapLoader;
      // Les restaurants fermés ne sont pas placés sur la carte.
      return (
        <Suspense fallback={mapLoader}>
          <RestaurantsMap restaurants={filteredData.filter((r) => !r.closed)} />
        </Suspense>
      );
    }

    // --- Roue (Surprise du midi) ---
    if (viewMode === "roulette") {
      if (isLoading) return rouletteLoader;
      return (
        <Suspense fallback={rouletteLoader}>
          <RestaurantRoulette
            pool={filteredData.filter((r) => !r.closed)}
            excludedIds={rouletteExcluded}
            onExcludedChange={onRouletteExcludedChange}
            winnerId={rouletteWinnerId}
            onWinnerChange={onRouletteWinnerChange}
            cardProps={itemProps}
          />
        </Suspense>
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
            {waiting
              ? null
              : visibleData.map((restaurant, i) => (
                  <motion.div
                    key={restaurant.id}
                    // Cascade comptée dans la tranche : la suivante démarre aussitôt.
                    {...enter(i, 8, 0.02, 0.12)}
                  >
                    <RestaurantRow
                      {...itemProps(restaurant)}
                      priority={i < PRIORITY_ITEMS}
                    />
                  </motion.div>
                ))}
          </div>
          {!waiting && showMore}
        </>
      );
    }

    // --- Grille (défaut, inchangée) ---
    return (
      <>
        <div
          key={listKey}
          className="grid grid-flow-dense grid-cols-1 gap-2.5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {waiting
            ? null
            : visibleData.map((restaurant, i) => (
                <motion.div
                  key={restaurant.id}
                  {...enter(i, 12, 0.03, 0.15)}
                >
                  <RestaurantCardTW
                    {...itemProps(restaurant)}
                    priority={i < PRIORITY_ITEMS}
                  />
                </motion.div>
              ))}
        </div>
        {!waiting && showMore}
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

      {isAdmin && editOpened && (
        <Suspense fallback={null}>
          <LazyRestaurantDialog
            isOpen={!!editTarget}
            onClose={() => setEditTarget(null)}
            onSuccess={() => {
              setEditTarget(null);
              queryClient.invalidateQueries();
            }}
            initialData={editTarget ?? undefined}
          />
        </Suspense>
      )}
    </div>
  );
};

export default RestaurantGrid;

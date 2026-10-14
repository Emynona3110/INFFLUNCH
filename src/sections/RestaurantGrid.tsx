import { cn } from "@/lib/utils";
import { SECTION_BODY } from "@/lib/sectionClasses";
import { useRef, useState } from "react";
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
import PageLoader from "@/components/brand/PageLoader";
import { Skeleton } from "@/components/ui/skeleton";

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
const CardSkeleton = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-[0_10px_30px_-12px_rgba(2,8,40,0.22)]">
    <Skeleton className="h-32 w-full rounded-none sm:h-48" />
    <div className="flex grow flex-col gap-1 px-3 py-2 sm:gap-2 sm:px-5 sm:py-4">
      <div className="flex h-7 items-center sm:h-[2.175rem]">
        <Skeleton className="h-5 w-2/3 sm:h-6" />
      </div>
      <div className="flex h-[22px] items-center gap-2 sm:h-6">
        <Skeleton className="h-3.5 w-28 sm:h-4" />
        <Skeleton className="ml-auto h-5 w-14 rounded-full sm:h-6" />
      </div>
      <div className="flex h-7 items-center gap-1.5 sm:h-8">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="ml-auto h-6 w-6 rounded-full sm:h-7 sm:w-7" />
      </div>
    </div>
  </div>
);

/** Mêmes dimensions que RestaurantRow : sur mobile, ni vignette ni tags. */
const RowSkeleton = () => (
  <div className="flex items-stretch gap-2 p-2 sm:items-center sm:gap-4 sm:rounded-card sm:border sm:border-border sm:bg-card sm:p-3">
    <Skeleton className="hidden h-20 w-28 shrink-0 rounded-lg sm:block" />
    <div className="flex min-w-0 flex-1 flex-col justify-between">
      <div className="flex h-6 items-center sm:h-7">
        <Skeleton className="h-4 w-1/3 sm:h-5" />
      </div>
      <div className="mt-0.5 flex min-h-6 items-center">
        <Skeleton className="h-3.5 w-1/4" />
      </div>
      <div className="mt-1.5 hidden gap-1.5 sm:flex">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
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

  // Squelettes affichés pour cette liste : ils ont déjà joué l'arrivée (fondu
  // en montant, avec la page). Les tuiles qui les remplacent prennent leur
  // place telles quelles, sans fondu : un fondu depuis le vide faisait
  // clignoter la grille (squelette → rien → tuile) ; seules les photos
  // arrivent en fondu, sur le même gris que le squelette. Les tranches
  // suivantes (« voir plus ») et les listes servies du cache gardent leur
  // cascade.
  const skeletonFor = useRef<string | null>(null);
  // Oublié dès qu'on change de liste : revenir plus tard sur celle-ci (ex.
  // décocher les favoris) doit rejouer la cascade, pas l'apparition sur place.
  if (isLoading) skeletonFor.current = listKey;
  else if (skeletonFor.current !== listKey) skeletonFor.current = null;
  const replacesSkeleton = (i: number) =>
    skeletonFor.current === listKey && i < PAGE_SIZE;
  const enter = (i: number, y: number, step: number, max: number) =>
    replacesSkeleton(i)
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.35,
            delay: Math.min((i % PAGE_SIZE) * step, max),
          },
        };

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
            <PageLoader />
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
            <PageLoader />
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
                  {...enter(i, 12, 0.03, 0.15)}
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

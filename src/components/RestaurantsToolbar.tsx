import { useState } from "react";
import { FiPlus, FiGrid, FiList, FiMap } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import SearchInput from "./SearchInput";
import FilterDialog from "./FilterDialog";
import FavoritesToggle from "./FavoritesToggle";
import useIsAdmin from "../hooks/useIsAdmin";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";
import { Tooltip } from "@/components/ui/tooltip";
import { RestaurantFilters, ViewMode } from "../pages/UserPage";
import { cn } from "@/lib/utils";

interface RestaurantsToolbarProps {
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
  onSearch: (input: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { mode: ViewMode; label: string; Icon: typeof FiGrid }[] = [
  { mode: "grid", label: "Grille", Icon: FiGrid },
  { mode: "list", label: "Liste", Icon: FiList },
  { mode: "map", label: "Carte", Icon: FiMap },
];

/**
 * Barre d'outils propre à la page Restaurants (recherche, vue, favoris,
 * filtres, ajout). Rendue par UserPage dans le slot `toolbar` du Layout, sous
 * la navbar — celle-ci reste dédiée à la navigation globale.
 */
const RestaurantsToolbar = ({
  restaurantFilters,
  onFilterChange,
  onSearch,
  viewMode,
  onViewModeChange,
}: RestaurantsToolbarProps) => {
  const [addOpen, setAddOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  return (
    <div className="flex w-full select-none items-center gap-2">
      <div className="min-w-0 flex-1">
        <SearchInput onSearch={onSearch} />
      </div>

      {/* Toggle d'affichage : grille (défaut) / liste / carte globale */}
      <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
        {VIEW_MODES.map(({ mode, label, Icon }) => {
          const active = viewMode === mode;
          return (
            <Tooltip key={mode} label={label}>
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition",
                  active
                    ? "bg-card text-primary shadow-sm"
                    : "text-foreground/55 hover:text-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>
          );
        })}
      </div>

      <FavoritesToggle
        isChecked={!!restaurantFilters.favoritesOnly}
        onChange={(checked) =>
          onFilterChange({ ...restaurantFilters, favoritesOnly: checked })
        }
      />
      <FilterDialog
        restaurantFilters={restaurantFilters}
        onFilterChange={onFilterChange}
      />

      {isAdmin && (
        <>
          <Tooltip label="Ajouter un restaurant">
            <button
              type="button"
              aria-label="Ajouter un restaurant"
              onClick={() => setAddOpen(true)}
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
            >
              <FiPlus className="h-6 w-6" />
            </button>
          </Tooltip>
          <RestaurantDialog
            isOpen={addOpen}
            onClose={() => setAddOpen(false)}
            onSuccess={() => {
              setAddOpen(false);
              queryClient.invalidateQueries();
            }}
          />
        </>
      )}
    </div>
  );
};

export default RestaurantsToolbar;

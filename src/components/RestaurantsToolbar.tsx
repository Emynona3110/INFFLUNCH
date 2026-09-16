import { useEffect, useRef, useState } from "react";
import { FiPlus, FiGrid, FiList, FiMap, FiX } from "react-icons/fi";
import { BsSearch } from "react-icons/bs";
import { AnimatePresence, motion } from "framer-motion";
import { LuDices } from "react-icons/lu";
import { IconType } from "react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

const VIEW_MODES: { mode: ViewMode; label: string; Icon: IconType }[] = [
  { mode: "grid", label: "Grille", Icon: FiGrid },
  { mode: "list", label: "Liste", Icon: FiList },
  { mode: "map", label: "Carte", Icon: FiMap },
  { mode: "roulette", label: "Roulette", Icon: LuDices },
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
  // Mobile : la recherche est repliée en une loupe ; dépliée, elle occupe
  // toute la barre (les autres contrôles se cachent le temps de la saisie).
  const [searchOpen, setSearchOpen] = useState(false);
  // Mobile : le sélecteur de vue est un menu déroulant (mode courant seul).
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viewMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!viewMenuRef.current?.contains(e.target as Node))
        setViewMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [viewMenuOpen]);
  const current = VIEW_MODES.find((v) => v.mode === viewMode) ?? VIEW_MODES[0];
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <div className="flex w-full select-none items-center gap-1 sm:gap-2">
      {/* Mobile, recherche dépliée : champ pleine largeur + fermeture. */}
      {searchOpen && (
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:hidden">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={restaurantFilters.searchText}
              autoFocus
              onSearch={(input) => {
                onSearch(input);
                setSearchOpen(false);
              }}
            />
          </div>
          <button
            type="button"
            aria-label="Fermer la recherche"
            onClick={() => setSearchOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Mobile, recherche repliée : une loupe (point si une recherche est active). */}
      {!searchOpen && (
        <button
          type="button"
          aria-label="Rechercher"
          onClick={() => setSearchOpen(true)}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 sm:hidden"
        >
          <BsSearch className="h-[18px] w-[18px]" />
          {restaurantFilters.searchText && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      )}

      {/* Desktop : barre de recherche complète. */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <SearchInput value={restaurantFilters.searchText} onSearch={onSearch} />
      </div>

      {/* Autres contrôles : cachés sur mobile pendant la saisie. */}
      <div
        className={cn(
          "ml-auto items-center gap-1 sm:gap-2",
          searchOpen ? "hidden sm:flex" : "flex",
        )}
      >
        {/* Mobile : icône du mode courant ; au tap, les autres modes se
          déroulent en colonne dessous (animation), un tap = changement. */}
        <div ref={viewMenuRef} className="relative sm:hidden">
          <button
            type="button"
            aria-label={`Affichage : ${current.label}`}
            aria-haspopup="menu"
            aria-expanded={viewMenuOpen}
            onClick={() => setViewMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-primary"
          >
            <current.Icon className="h-[18px] w-[18px]" />
          </button>
          <AnimatePresence>
            {viewMenuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scaleY: 0.6 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ originY: 0 }}
                className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-1 rounded-full bg-muted p-0.5 shadow-md"
              >
                {VIEW_MODES.filter((v) => v.mode !== viewMode).map(
                  ({ mode, label, Icon }, i) => (
                    <motion.button
                      key={mode}
                      type="button"
                      role="menuitem"
                      aria-label={label}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.15 }}
                      onClick={() => {
                        onViewModeChange(mode);
                        setViewMenuOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground/60 shadow-sm"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </motion.button>
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop : toggle d'affichage grille (défaut) / liste / carte / roue */}
        <div className="hidden items-center gap-0.5 rounded-full bg-muted p-0.5 sm:flex">
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
                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-foreground/55 hover:text-foreground",
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
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary sm:h-10 sm:w-10"
              >
                <FiPlus className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </Tooltip>
            <RestaurantDialog
              isOpen={addOpen}
              onClose={() => setAddOpen(false)}
              onSuccess={(slug) => {
                setAddOpen(false);
                queryClient.invalidateQueries();
                // On enchaîne sur la fiche toute neuve : c'est là qu'on ajoute
                // photos et menus, autant y être tout de suite.
                if (slug) navigate(`/restaurant/${slug}`);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantsToolbar;

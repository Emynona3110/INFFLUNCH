import { useState } from "react";
import { BsFilter } from "react-icons/bs";
import { FaStar, FaRegStar } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import { SortOrder } from "./SortSelector";
import useTags from "../hooks/useTags";
import { defaultRestaurantFilters, RestaurantFilters } from "../pages/UserPage";
import BadgesToggles from "./BadgesToggles";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FilterDialogProps {
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
}

const hasActiveFilters = (filters: RestaurantFilters) =>
  filters.minRate > 0 ||
  filters.tags.length > 0 ||
  filters.badges.length > 0 ||
  filters.sortOrder !== defaultRestaurantFilters.sortOrder;

const RatingStars = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((v) => (
      <button
        key={v}
        type="button"
        aria-label={`Note minimum ${v}`}
        onClick={() => onChange(value === v ? v - 1 : v)}
        className="cursor-pointer transition"
      >
        {v <= value ? (
          <FaStar className="h-6 w-6 text-amber-500" />
        ) : (
          <FaRegStar className="h-6 w-6 text-foreground/25" />
        )}
      </button>
    ))}
  </div>
);

const FilterDialog = ({ restaurantFilters, onFilterChange }: FilterDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localQuery, setLocalQuery] =
    useState<RestaurantFilters>(restaurantFilters);

  const { data: availableTags } = useTags();

  const handleOpen = () => {
    setLocalQuery(restaurantFilters);
    setIsOpen(true);
  };

  const handleValidate = () => {
    onFilterChange(localQuery);
    setIsOpen(false);
  };

  const selectableTags = availableTags
    .filter((tag) => !localQuery.tags.includes(tag.label))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <button
        type="button"
        aria-label="Filtres"
        onClick={handleOpen}
        className="relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-foreground/60 transition hover:bg-muted"
      >
        <BsFilter className="h-6 w-6" />
        {hasActiveFilters(restaurantFilters) && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
        )}
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Filtres</DialogTitle>

        <div className="mt-5 space-y-5">
          {/* Tri */}
          <div>
            <span className="text-sm font-bold text-foreground">Trier par</span>
            <div className="relative mt-1.5">
              <select
                value={localQuery.sortOrder}
                onChange={(e) =>
                  setLocalQuery({
                    ...localQuery,
                    sortOrder: e.target.value as SortOrder,
                  })
                }
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <option value="relevance">Pertinence</option>
                <option value="rating">Meilleures notes</option>
                <option value="distance">Proximité</option>
                <option value="reviews">Nombre d'avis</option>
                <option value="created_at">Ajout récent</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            </div>
          </div>

          {/* Note minimum */}
          <div>
            <span className="text-sm font-bold text-foreground">
              Note minimum
            </span>
            <div className="mt-1.5">
              <RatingStars
                value={localQuery.minRate}
                onChange={(v) => setLocalQuery({ ...localQuery, minRate: v })}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-sm font-bold text-foreground">Tags</span>
            <div className="mb-2 mt-1.5 flex min-h-6 flex-wrap gap-1.5">
              {localQuery.tags.length > 0 ? (
                localQuery.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Retirer ${tag}`}
                      onClick={() =>
                        setLocalQuery({
                          ...localQuery,
                          tags: localQuery.tags.filter((t) => t !== tag),
                        })
                      }
                      className="cursor-pointer text-primary/60 transition hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-sm text-foreground/50">
                  Aucun tag sélectionné
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && !localQuery.tags.includes(v)) {
                    setLocalQuery((prev) => ({
                      ...prev,
                      tags: [...prev.tags, v].sort(),
                    }));
                  }
                }}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <option value="">Choisir un tag</option>
                {selectableTags.map((tag) => (
                  <option key={tag.id} value={tag.label}>
                    {tag.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            </div>
          </div>

          {/* Badges */}
          <div>
            <span className="text-sm font-bold text-foreground">Badges</span>
            <div className="mt-1.5">
              <BadgesToggles
                selected={localQuery.badges}
                onChange={(updated) =>
                  setLocalQuery({ ...localQuery, badges: updated })
                }
                className="justify-center"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocalQuery(defaultRestaurantFilters)}
          >
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidate}>Valider</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default FilterDialog;

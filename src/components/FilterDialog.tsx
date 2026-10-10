import { useState } from "react";
import { LuListFilter } from "react-icons/lu";
import { FaStar, FaRegStar } from "react-icons/fa";
import SortSelector from "./SortSelector";
import { defaultRestaurantFilters, RestaurantFilters } from "../pages/UserPage";
import BadgesToggles from "./BadgesToggles";
import { RangeSlider } from "@/components/ui/slider";
import {
  DEFAULT_PRICE_FILTER,
  PRICE_FILTER_MAX,
  PRICE_FILTER_MIN,
  formatPriceFilter,
  isPriceFilterActive,
} from "../services/price";
import TagPicker from "./TagPicker";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterDialogProps {
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
}

const hasActiveFilters = (filters: RestaurantFilters) =>
  filters.minRate > 0 ||
  isPriceFilterActive(filters.priceRange) ||
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

  const handleOpen = () => {
    setLocalQuery(restaurantFilters);
    setIsOpen(true);
  };

  const handleValidate = () => {
    onFilterChange(localQuery);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Filtres"
        onClick={handleOpen}
        className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/60 transition hover:bg-muted sm:h-9 sm:w-9"
      >
        <LuListFilter className="h-5 w-5" />
        {hasActiveFilters(restaurantFilters) && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#ea580c] ring-2 ring-card" />
        )}
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Filtres</DialogTitle>

        <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-5">
          {/* Tri */}
          <div>
            <span className="text-sm font-bold text-foreground">Trier par</span>
            <div className="mt-1.5">
              <SortSelector
                value={localQuery.sortOrder}
                onChange={(sortOrder) => setLocalQuery({ ...localQuery, sortOrder })}
              />
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

          {/* Prix du midi : curseur à deux poignées. Collé aux deux bornes, il
              ne filtre rien ; la borne haute au maximum vaut « et plus ». */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-foreground">
                Prix du midi
              </span>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  isPriceFilterActive(localQuery.priceRange)
                    ? "font-semibold text-primary"
                    : "text-foreground/50",
                )}
              >
                {formatPriceFilter(localQuery.priceRange ?? DEFAULT_PRICE_FILTER)}
              </span>
            </div>
            <RangeSlider
              className="mt-1.5"
              value={localQuery.priceRange ?? DEFAULT_PRICE_FILTER}
              onChange={(priceRange) =>
                setLocalQuery({ ...localQuery, priceRange })
              }
              min={PRICE_FILTER_MIN}
              max={PRICE_FILTER_MAX}
              labels={["Prix minimum", "Prix maximum"]}
            />
            <p className="mt-1 text-xs text-foreground/50">
              Les restaurants dont le prix n'est pas renseigné sont masqués.
            </p>
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
            <TagPicker
              selected={localQuery.tags}
              onPick={(label) =>
                setLocalQuery((prev) => ({
                  ...prev,
                  tags: [...prev.tags, label].sort(),
                }))
              }
            />
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

        <div className="mt-4 sm:mt-6 flex items-center justify-between">
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

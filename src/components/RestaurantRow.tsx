import { useNavigate } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { Restaurant } from "@/hooks/useRestaurants";
import noImage from "@/assets/no-image.jpg";
import badgeMap, { topRatedIcon } from "@/services/badgeMap";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import LikeButton from "@/components/LikeButton";
import { Stars } from "@/components/RestaurantCardTW";
import { cn } from "@/lib/utils";

interface Props {
  restaurant: Restaurant;
  topRated: { id: number }[];
  featured?: boolean;
  liked: boolean;
  onLikeToggle: (liked: boolean) => Promise<void>;
  /** Fourni uniquement pour les admins : ouvre le dialog d'édition. */
  onEdit?: () => void;
}

/** Variante "ligne" de la card resto (mode liste). Mêmes infos, en horizontal. */
const RestaurantRow = ({
  restaurant,
  topRated = [],
  featured = false,
  liked,
  onLikeToggle,
  onEdit,
}: Props) => {
  const navigate = useNavigate();

  const isTop = topRated.some((t) => t.id === restaurant.id);
  const visibleBadges = (restaurant.badges ?? []).filter((b) => badgeMap[b]);

  const tags = restaurant.tags ?? [];
  const MAX_TAGS = 4;
  const extraTags = tags.length - MAX_TAGS;

  return (
    <article
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
      className={cn(
        "group flex cursor-pointer select-none items-center gap-4 overflow-hidden rounded-card bg-card p-3 shadow-[0_8px_24px_-14px_rgba(2,8,40,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-16px_rgba(2,8,40,0.30)]",
        featured ? "ring-2 ring-primary" : "border border-border"
      )}
    >
      {/* Vignette */}
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
        <img
          src={restaurant.image ?? noImage}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isTop && (
          <Tooltip label="Top 3 des mieux notés">
            <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
              <img src={topRatedIcon} alt="" className="h-3 w-3" />
              Top 3
            </span>
          </Tooltip>
        )}
      </div>

      {/* Infos principales */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div
            role="heading"
            aria-level={3}
            className="min-w-0 truncate font-display text-lg font-bold text-card-foreground"
          >
            {restaurant.name}
          </div>
          {visibleBadges.length > 0 && (
            <div className="flex shrink-0 gap-1">
              {visibleBadges.map((b) => (
                <Tooltip key={b} label={b}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <img
                      src={badgeMap[b]}
                      alt={b}
                      className="h-3.5 w-3.5 object-contain"
                    />
                  </span>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        <div className="mt-0.5 flex min-h-6 items-center gap-2 text-sm text-foreground/60">
          <Stars rating={restaurant.rating ?? 0} />
          {restaurant.reviews > 0 && (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-foreground/80">
                {restaurant.rating}
              </span>
              <span className="text-foreground/20">|</span>
              <span>{restaurant.reviews} avis</span>
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <Badge key={tag} variant="primary">
                {tag}
              </Badge>
            ))}
            {extraTags > 0 && (
              <Tooltip label={tags.slice(MAX_TAGS).join(", ")}>
                <Badge variant="muted">+{extraTags}</Badge>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Distance + actions */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-1 whitespace-nowrap text-xs font-medium text-foreground/60 sm:inline-flex">
          <HiOutlineLocationMarker className="h-3.5 w-3.5" />
          {restaurant.distanceLabel}
          {restaurant.walk_minutes != null && (
            <span className="opacity-60">· {restaurant.walk_minutes} min</span>
          )}
        </span>

        {onEdit && (
          <Tooltip label="Modifier">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Modifier le restaurant"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          </Tooltip>
        )}

        <LikeButton
          liked={liked}
          onToggle={onLikeToggle}
          stopPropagation
          className="h-8 w-8 shrink-0"
        />
      </div>
    </article>
  );
};

export default RestaurantRow;

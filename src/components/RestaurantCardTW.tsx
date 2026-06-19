import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { Restaurant } from "@/hooks/useRestaurants";
import noImage from "@/assets/no-image.jpg";
import badgeMap, { topRatedIcon } from "@/services/badgeMap";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import LikeButton from "@/components/LikeButton";
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

function Stars({ rating }: { rating: number }) {
  // Arrondi au demi-point pour un remplissage partiel (comme la version d'origine)
  const rounded = Math.floor((rating ?? 0) * 2) / 2;
  const pct = (rounded / 5) * 100;
  return (
    <span className="relative inline-flex">
      <span className="flex gap-px text-black/15 dark:text-white/15">
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar key={i} className="h-[18px] w-[18px]" />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-px text-amber-500"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar key={i} className="h-[18px] w-[18px]" />
        ))}
      </span>
    </span>
  );
}

const RestaurantCardTW = ({
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

  return (
    <article
      onClick={() => navigate(`/user/restaurant/${restaurant.slug}`)}
      className={cn(
        "group flex h-full cursor-pointer select-none flex-col overflow-hidden rounded-card bg-card shadow-[0_10px_30px_-12px_rgba(2,8,40,0.22)] transition duration-200 transform-gpu [backface-visibility:hidden] hover:-translate-y-1 hover:shadow-[0_18px_44px_-14px_rgba(2,8,40,0.30)]",
        featured ? "ring-2 ring-primary" : "border border-border"
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={restaurant.image ?? noImage}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {isTop && (
          <Tooltip label="Top 3 des mieux notés">
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
              <img src={topRatedIcon} alt="" className="h-3.5 w-3.5" />
              Top
            </span>
          </Tooltip>
        )}

        {visibleBadges.length > 0 && (
          <div className="absolute right-3 top-3 flex gap-1.5">
            {visibleBadges.map((b) => (
              <Tooltip key={b} label={b}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/85 shadow-sm backdrop-blur">
                  <img src={badgeMap[b]} alt={b} className="h-4 w-4 object-contain" />
                </span>
              </Tooltip>
            ))}
          </div>
        )}

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/55 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm dark:bg-black/45 dark:text-white">
          <HiOutlineLocationMarker className="h-3.5 w-3.5" />
          {restaurant.distanceLabel}
        </span>
      </div>

      {/* Corps */}
      <div className="flex grow flex-col gap-2 px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            role="heading"
            aria-level={3}
            className="min-w-0 flex-1 truncate font-display text-[1.4rem] font-bold text-card-foreground"
          >
            {restaurant.name}
          </div>
          {onEdit && (
            <Tooltip label="Modifier">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label="Modifier le restaurant"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base leading-none text-foreground/50 transition hover:bg-muted hover:text-primary"
              >
                ✎
              </button>
            </Tooltip>
          )}
        </div>

        <div className="flex min-h-6 items-center gap-2 text-sm text-foreground/60">
          <Stars rating={restaurant.rating ?? 0} />
          {restaurant.reviews > 0 && (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-foreground/80">{restaurant.rating}</span>
              <span className="text-foreground/20">|</span>
              <span>{restaurant.reviews} avis</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(restaurant.tags ?? []).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="primary">
                {tag}
              </Badge>
            ))}
          </div>

          <LikeButton
            liked={liked}
            onToggle={onLikeToggle}
            stopPropagation
            className="h-8 w-8 shrink-0"
          />
        </div>
      </div>
    </article>
  );
};

export default RestaurantCardTW;

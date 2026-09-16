import { useNavigate } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { Restaurant } from "@/hooks/useRestaurants";
import noImage from "@/assets/no-image.jpg";
import badgeMap, { orderBadges } from "@/services/badgeMap";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import LikeButton from "@/components/LikeButton";
import useSortedTags from "@/hooks/useSortedTags";
import LunchAvatars from "@/components/LunchAvatars";
import ClosedBadge from "@/components/ClosedBadge";
import TopBadge, { topRankOf } from "@/components/TopBadge";
import { Stars } from "@/components/RestaurantCardTW";
import { cn } from "@/lib/utils";
import { HOVER_ZOOM_IMG } from "@/lib/imageClasses";

interface Props {
  restaurant: Restaurant;
  topRated: { id: number }[];
  liked: boolean;
  onLikeToggle: (liked: boolean) => Promise<void>;
  /** Fourni uniquement pour les admins : ouvre le dialog d'édition. */
  onEdit?: () => void;
}

/** Variante "ligne" de la card resto (mode liste). Mêmes infos, en horizontal. */
const RestaurantRow = ({
  restaurant,
  topRated = [],
  liked,
  onLikeToggle,
  onEdit,
}: Props) => {
  const navigate = useNavigate();

  const topRank = topRankOf(topRated, restaurant.id);
  const visibleBadges = orderBadges(restaurant.badges);

  // Ordre des tags : origines, puis caractéristiques, puis plats.
  const tags = useSortedTags(restaurant.tags);
  const MAX_TAGS = 4;
  const extraTags = tags.length - MAX_TAGS;

  const badges = visibleBadges.length > 0 && (
    <div className="flex shrink-0 gap-1">
      {visibleBadges.map((b) => (
        <Tooltip key={b} label={b}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <img src={badgeMap[b]} alt={b} className="h-4 w-4 object-contain" />
          </span>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <article
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
      className="group flex cursor-pointer select-none items-stretch gap-2 overflow-hidden rounded-card border border-border bg-card p-2 sm:items-center sm:gap-4 sm:p-3 shadow-[0_8px_24px_-14px_rgba(2,8,40,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-16px_rgba(2,8,40,0.30)]"
    >
      {/* Vignette */}
      <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:block">
        <img
          src={restaurant.image ?? noImage}
          alt={restaurant.name}
          className={cn(
            HOVER_ZOOM_IMG,
            restaurant.closed && "grayscale"
          )}
        />
        {restaurant.closed && (
          <ClosedBadge compact className="absolute left-1 top-1" />
        )}
        <TopBadge rank={topRank} size="sm" className="absolute left-1 top-1" />
      </div>

      {/* Infos principales (mobile : nom en haut, étoiles en bas, calés sur
          les coins comme la colonne de droite) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div
            role="heading"
            aria-level={3}
            className={cn(
              "min-w-0 truncate font-display text-base font-bold text-card-foreground sm:text-lg",
              // Mobile : pas de vignette (ni de badge « Fermé ») → nom grisé.
              restaurant.closed && "text-foreground/40 sm:text-card-foreground"
            )}
          >
            {restaurant.name}
          </div>
          {/* Mobile : les icônes atouts descendent sur la ligne des étoiles,
              remplacées ici par les collègues qui y déjeunent. */}
          <div className="shrink-0 sm:hidden">
            <LunchAvatars restaurantId={restaurant.id} size={22} />
          </div>
          {badges && <div className="hidden sm:block">{badges}</div>}
        </div>

        <div className="mt-0.5 flex min-h-6 flex-wrap items-center gap-2 text-sm text-foreground/60">
          <Stars rating={restaurant.rating ?? 0} />
          {/* Mobile : ni note exacte ni nb d'avis, juste les étoiles. */}
          {restaurant.reviews > 0 && (
            <span className="hidden items-center gap-2 whitespace-nowrap sm:flex">
              <span className="font-semibold text-foreground/80">
                {restaurant.rating}
              </span>
              <span className="text-foreground/20">|</span>
              <span>{restaurant.reviews} avis</span>
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-1.5 hidden flex-wrap gap-1.5 sm:flex">
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
      <div className="flex shrink-0 flex-col items-end justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
        {/* Mobile : icônes atouts au-dessus du cœur. */}
        {badges && <div className="sm:hidden">{badges}</div>}
        {/* Collègues qui déjeunent ici aujourd'hui (rien s'il n'y en a pas). */}
        <div className="hidden sm:block">
          <LunchAvatars restaurantId={restaurant.id} size={22} />
        </div>

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
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary sm:flex"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          </Tooltip>
        )}

        <LikeButton
          liked={liked}
          onToggle={onLikeToggle}
          stopPropagation
          iconClassName="h-4 w-4 sm:h-5 sm:w-5"
          className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
        />
      </div>
    </article>
  );
};

export default RestaurantRow;

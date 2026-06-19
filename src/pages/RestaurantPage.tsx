import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import {
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiGlobe,
  FiExternalLink,
} from "react-icons/fi";
import useRestaurants from "@/hooks/useRestaurants";
import useTopRated from "@/hooks/useTopRated";
import useFavorites from "@/hooks/useFavorites";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import badgeMap, { topRatedIcon } from "@/services/badgeMap";
import RestaurantMiniMap from "@/components/RestaurantMiniMap";
import LikeButton from "@/components/LikeButton";
import {
  sampleComments,
  formatAuthorName,
  authorInitials,
} from "@/data/sampleComments";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";

/* ------------------------------ helpers UI ------------------------------ */

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  const rounded = Math.floor((rating ?? 0) * 2) / 2;
  const pct = (rounded / 5) * 100;
  return (
    <span className="relative inline-flex">
      <span className="flex gap-px text-black/15 dark:text-white/20">
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar key={i} style={{ height: size, width: size }} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-px text-amber-500"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar key={i} style={{ height: size, width: size }} />
        ))}
      </span>
    </span>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Couleur d'avatar dérivée du nom (palette douce, déterministe).
const avatarColors = [
  "bg-sky-500/15 text-sky-600",
  "bg-violet-500/15 text-violet-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
];
const avatarColor = (key: string) =>
  avatarColors[key.charCodeAt(0) % avatarColors.length];

/* -------------------------------- page --------------------------------- */

const RestaurantPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data, loading, error } = useRestaurants({
    ...defaultRestaurantFilters,
    slug,
  });
  const restaurant = data[0];

  const topRatedResult = useTopRated();
  const topRated = !topRatedResult.error
    ? (topRatedResult.data as { id: number }[])
    : [];

  const {
    restaurantIds: favoriteIds,
    addFavorite,
    removeFavorite,
  } = useFavorites();

  // Remonte en haut quand on ouvre une nouvelle fiche.
  useEffect(() => window.scrollTo({ top: 0 }), [slug]);

  /* --------------------------- états de chargement --------------------------- */

  if (loading) {
    return (
      <div className="tw-scope flex h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="tw-scope mx-auto max-w-[1100px] py-16 text-center">
        <p className="text-foreground/70">
          {error ? `Erreur : ${error}` : "Ce restaurant est introuvable."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/user/restaurants")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <FiArrowLeft /> Retour aux restaurants
        </button>
      </div>
    );
  }

  const isTop = topRated.some((t) => t.id === restaurant.id);
  const liked = favoriteIds.includes(restaurant.id);
  const visibleBadges = (restaurant.badges ?? []).filter((b) => badgeMap[b]);
  const tags = restaurant.tags ?? [];
  const hasRating = !!restaurant.rating || restaurant.reviews > 0;

  const totalReviews = sampleComments.length;
  // Répartition par note (5→1) pour les barres type Amazon.
  const ratingCounts = (star: number) =>
    sampleComments.filter((c) => Math.round(c.rating) === star).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope mx-auto max-w-[1100px] pb-4"
    >
      {/* Retour */}
      <button
        type="button"
        onClick={() => navigate("/user/restaurants")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-foreground/60 transition hover:text-primary"
      >
        <FiArrowLeft className="h-4 w-4" /> Tous les restaurants
      </button>

      {/* Hero */}
      <div className="relative h-[300px] overflow-hidden rounded-card border border-border md:h-[380px]">
        <img
          src={restaurant.image ?? noImage}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {isTop && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
            <img src={topRatedIcon} alt="" className="h-3.5 w-3.5" />
            Top 3
          </span>
        )}

        <LikeButton
          liked={liked}
          onToggle={async (next) => {
            if (next) await addFavorite(restaurant.id);
            else await removeFavorite(restaurant.id);
          }}
          iconClassName="h-5 w-5"
          emptyClassName="text-foreground/60"
          className="absolute right-4 top-4 h-11 w-11 bg-card/85 shadow-md backdrop-blur hover:bg-card"
        />

        {/* Bandeau bas */}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div
            role="heading"
            aria-level={1}
            className="font-display text-3xl font-extrabold leading-tight text-white drop-shadow md:text-4xl"
          >
            {restaurant.name}
          </div>
          {hasRating && (
            <div className="mt-2 flex items-center gap-2 text-white/90">
              <Stars rating={restaurant.rating ?? 0} size={18} />
              {!!restaurant.rating && (
                <span className="text-sm font-semibold">{restaurant.rating}</span>
              )}
              {restaurant.reviews > 0 && (
                <span className="text-sm text-white/70">
                  ({restaurant.reviews} avis)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Corps : 2 colonnes */}
      {/* Corps. Sur mobile l'ordre est atouts → coordonnées → situation → avis
          (infos pratiques avant les avis) ; à partir de lg, colonne gauche
          (atouts + avis) et sidebar à droite (order + placement explicite). */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Atouts */}
        {visibleBadges.length > 0 && (
          <section className="order-1 self-start rounded-card border border-border bg-card p-5 lg:col-span-2">
            <div
              role="heading"
              aria-level={2}
              className="mb-3 font-display text-lg font-bold text-card-foreground"
            >
              Les atouts
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleBadges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground/80"
                >
                  <img src={badgeMap[b]} alt="" className="h-4 w-4 object-contain" />
                  {b}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Colonne latérale : coordonnées + situation. */}
        <aside className="order-2 space-y-6 self-start lg:col-start-3 lg:row-start-1 lg:row-span-2">
          {/* Coordonnées */}
          <section className="rounded-card border border-border bg-card p-5">
            <div
              role="heading"
              aria-level={2}
              className="mb-3 font-display text-lg font-bold text-card-foreground"
            >
              Coordonnées
            </div>
            <ul className="m-0 list-none space-y-3 p-0 text-sm">
              {restaurant.address && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{restaurant.address}</span>
                </li>
              )}
              {restaurant.phone && (
                <li className="flex items-center gap-3">
                  <FiPhone className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="text-foreground/80 transition hover:text-primary"
                  >
                    {restaurant.phone}
                  </a>
                </li>
              )}
              {restaurant.website && (
                <li className="flex items-center gap-3">
                  <FiGlobe className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 truncate text-foreground/80 transition hover:text-primary"
                  >
                    Site web <FiExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              )}
            </ul>
          </section>

          {/* Carte */}
          <section className="overflow-hidden rounded-card border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <div
                role="heading"
                aria-level={2}
                className="font-display text-lg font-bold text-card-foreground"
              >
                Carte
              </div>
            </div>
            <RestaurantMiniMap
              address={restaurant.address}
              lat={restaurant.lat}
              lng={restaurant.lng}
              distanceLabel={restaurant.distanceLabel}
            />
          </section>
        </aside>

        {/* Avis */}
        <section className="order-3 self-start rounded-card border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div
                role="heading"
                aria-level={2}
                className="font-display text-lg font-bold text-card-foreground"
              >
                Avis de la communauté
              </div>
              {/* TODO (fonctionnel) : formulaire d'avis. Note par défaut = 0
                  étoile, saisie obligatoire de 1 à 5 étoiles avant envoi. */}
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="cursor-not-allowed rounded-lg bg-primary/90 px-3.5 py-1.5 text-sm font-medium text-primary-foreground opacity-60"
              >
                Écrire un avis
              </button>
            </div>

            {/* Répartition par note (type Amazon). Moyenne et total d'avis sont
                déjà affichés dans l'entête, pas de doublon ici. */}
            <div className="mb-5 space-y-1.5 rounded-xl bg-muted/40 p-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingCounts(star);
                const pct = totalReviews ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex w-6 shrink-0 items-center justify-end gap-0.5 font-medium text-foreground/70">
                      {star}
                      <FaStar className="h-3 w-3 text-amber-500" />
                    </span>
                    <span className="w-7 shrink-0 text-right tabular-nums text-foreground/45">
                      ({count})
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Liste */}
            <ul className="m-0 list-none space-y-4 p-0">
              {sampleComments.map((c) => (
                <li
                  key={c.id}
                  className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                        avatarColor(c.email)
                      )}
                    >
                      {authorInitials(c.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <span className="font-semibold text-card-foreground">
                          {formatAuthorName(c.email)}
                        </span>
                        <span className="text-xs text-foreground/45">
                          {formatDate(c.date)}
                        </span>
                      </div>
                      <Stars rating={c.rating} size={13} />
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                        {c.text}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
      </div>
    </motion.div>
  );
};

export default RestaurantPage;

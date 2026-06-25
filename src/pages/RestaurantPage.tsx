import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import {
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiGlobe,
  FiExternalLink,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import useRestaurants from "@/hooks/useRestaurants";
import useTopRated from "@/hooks/useTopRated";
import useFavorites from "@/hooks/useFavorites";
import useReviews from "@/hooks/useReviews";
import useSession from "@/hooks/useSession";
import useIsAdmin from "@/hooks/useIsAdmin";
import supabaseClient from "@/services/supabaseClient";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import badgeMap, { topRatedIcon } from "@/services/badgeMap";
import RestaurantMiniMap from "@/components/RestaurantMiniMap";
import LikeButton from "@/components/LikeButton";
import ReviewForm from "@/components/ReviewForm";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";
import LocationEditDialog from "@/components/LocationEditDialog";
import RestaurantGallery from "@/components/RestaurantGallery";
import RestaurantMenus from "@/components/RestaurantMenus";
import { Tooltip } from "@/components/ui/tooltip";
import { formatAuthorName } from "@/utils/authorName";
import Avatar from "@/components/Avatar";
import { toast } from "@/lib/toast";
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

  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const { data: reviews = [], isPending: reviewsLoading } = useReviews(
    restaurant?.id
  );
  const [showForm, setShowForm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mapEditOpen, setMapEditOpen] = useState(false);

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
          onClick={() => navigate("/restaurants")}
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

  const totalReviews = reviews.length;
  const myReview = reviews.find((r) => r.user_id === userId) ?? null;
  // On affiche toujours son propre avis (même sans texte), mais ceux des autres
  // uniquement s'ils ont un commentaire (une note seule n'apporte rien à lire).
  const visibleReviews = reviews.filter(
    (r) => r.user_id === userId || r.comment?.trim()
  );
  // Répartition par note (5→1) pour les barres type Amazon.
  const ratingCounts = (star: number) =>
    reviews.filter((r) => r.rating === star).length;

  const deleteReview = async (id: number) => {
    const { error } = await supabaseClient.from("reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, status: "error", duration: 5000 });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reviews", restaurant.id] });
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    toast({ title: "Avis supprimé", status: "success", duration: 2500 });
  };

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
        onClick={() => navigate("/restaurants")}
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
          className="absolute bottom-5 right-5 h-11 w-11 bg-card/85 shadow-md backdrop-blur hover:bg-card md:bottom-7 md:right-7"
        />

        {/* Bandeau bas */}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
          {tags.length > 0 && (
            <div className="mb-3 flex max-w-[16rem] flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div
              role="heading"
              aria-level={1}
              className="font-display text-3xl font-extrabold leading-tight text-white drop-shadow md:text-4xl"
            >
              {restaurant.name}
            </div>
            {isAdmin && (
              <Tooltip label="Modifier">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Modifier le restaurant"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Atouts : petites icônes (sans texte, infobulles) en haut à droite. */}
        {visibleBadges.length > 0 && (
          <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-1.5">
            {visibleBadges.map((b) => (
              <Tooltip key={b} label={b}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card/85 shadow-sm backdrop-blur">
                  <img src={badgeMap[b]} alt={b} className="h-5 w-5 object-contain" />
                </span>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Corps : 2 colonnes (les atouts sont dans le hero, en bas à droite).
          Sur mobile l'ordre est coordonnées → carte → photos → avis (order-2..4) ;
          à partir de lg, colonne gauche (photos + avis) et sidebar à droite
          (placement explicite col-start/row-start). */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche (photos + avis). Desktop : flex col occupant 2/3.
            Mobile : display:contents pour que la sidebar (coordonnées + carte,
            order-2) s'intercale → infos → photos → avis. */}
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
          {/* Photos (galerie collaborateurs) */}
          <div className="order-3">
            <RestaurantGallery
              restaurantId={restaurant.id}
              slug={restaurant.slug}
              userId={userId}
              isAdmin={isAdmin}
            />
          </div>

          {/* Avis */}
          <section className="order-4 rounded-card border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div
                role="heading"
                aria-level={2}
                className="font-display text-lg font-bold text-card-foreground"
              >
                Avis des collaborateurs
              </div>
              {!myReview && !showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Écrire un avis
                </button>
              )}
            </div>

            {showForm && (
              <ReviewForm
                restaurantId={restaurant.id}
                existing={myReview}
                onDone={() => setShowForm(false)}
              />
            )}

            {/* Répartition par note (type Amazon). Moyenne et total d'avis sont
                déjà affichés dans l'entête, pas de doublon ici. */}
            {totalReviews > 0 && (
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
            )}

            {/* Liste */}
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : visibleReviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground/55">
                Aucun avis pour le moment. Sois le premier à en laisser un !
              </p>
            ) : (
              <ul className="m-0 list-none space-y-4 p-0">
                {visibleReviews.map((r) => {
                  const mine = r.user_id === userId;
                  return (
                    <li
                      key={r.id}
                      className="border-t border-border/60 pt-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          email={r.email}
                          avatarPath={r.avatar_path}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                            <span
                              className={cn(
                                "font-semibold",
                                mine ? "text-primary" : "text-card-foreground"
                              )}
                            >
                              {formatAuthorName(r.email)}
                            </span>
                            <span className="text-xs text-foreground/45">
                              {formatDate(r.created_at)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3">
                            <Stars rating={r.rating} size={16} />
                            {(mine || isAdmin) && (
                              <div className="flex items-center gap-2 text-xs">
                                {mine && (
                                  <button
                                    type="button"
                                    onClick={() => setShowForm(true)}
                                    className="inline-flex items-center gap-1 text-foreground/55 transition hover:text-primary"
                                  >
                                    <FiEdit2 className="h-3.5 w-3.5" /> Modifier
                                  </button>
                                )}
                                {mine && (
                                  <span className="text-foreground/25">|</span>
                                )}
                                <HoldToDeleteButton
                                  onConfirm={() => deleteReview(r.id)}
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-foreground/55 hover:text-destructive"
                                  progressClassName="bg-destructive/15"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" /> Supprimer
                                </HoldToDeleteButton>
                              </div>
                            )}
                          </div>
                          {r.comment && (
                            <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                              {r.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar : coordonnées + carte. Indépendante (pas de row-span). */}
        <aside className="order-2 space-y-6 self-start lg:col-start-3 lg:row-start-1">
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

          {/* Menu (lien / PDF / photos, collaboratif) — avant la carte */}
          <RestaurantMenus
            restaurantId={restaurant.id}
            slug={restaurant.slug}
            userId={userId}
            isAdmin={isAdmin}
          />

          {/* Carte */}
          <section className="overflow-hidden rounded-card border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div
                role="heading"
                aria-level={2}
                className="font-display text-lg font-bold text-card-foreground"
              >
                Carte
              </div>
              {isAdmin && (
                <Tooltip label="Modifier la position">
                  <button
                    type="button"
                    onClick={() => setMapEditOpen(true)}
                    aria-label="Modifier la position"
                    className="grid h-8 w-8 place-items-center rounded-full text-foreground/50 transition hover:bg-muted hover:text-primary"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </div>
            <RestaurantMiniMap
              address={restaurant.address}
              lat={restaurant.lat}
              lng={restaurant.lng}
              distanceLabel={restaurant.distanceLabel}
              walkMinutes={restaurant.walk_minutes}
            />
          </section>
        </aside>
      </div>

      {isAdmin && (
        <>
          <RestaurantDialog
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            onSuccess={() => {
              setEditOpen(false);
              queryClient.invalidateQueries();
            }}
            initialData={restaurant}
          />
          <LocationEditDialog
            isOpen={mapEditOpen}
            onClose={() => setMapEditOpen(false)}
            restaurant={{
              id: restaurant.id,
              address: restaurant.address,
              lat: restaurant.lat,
              lng: restaurant.lng,
            }}
          />
        </>
      )}
    </motion.div>
  );
};

export default RestaurantPage;

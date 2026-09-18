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
  FiSlash,
  FiMap,
  FiPlus,
} from "react-icons/fi";
import useRestaurants from "@/hooks/useRestaurants";
import useTopRated from "@/hooks/useTopRated";
import useFavorites from "@/hooks/useFavorites";
import useReviews from "@/hooks/useReviews";
import useSortedTags from "@/hooks/useSortedTags";
import useSession from "@/hooks/useSession";
import useIsAdmin from "@/hooks/useIsAdmin";
import supabaseClient from "@/services/supabaseClient";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import badgeMap, { orderBadges } from "@/services/badgeMap";
import RestaurantMiniMap from "@/components/RestaurantMiniMap";
import LikeButton from "@/components/LikeButton";
import LunchButton from "@/components/LunchButton";
import OrderButton from "@/components/OrderButton";
import LunchAvatars from "@/components/LunchAvatars";
import ClosedBadge from "@/components/ClosedBadge";
import TopBadge, { topRankOf } from "@/components/TopBadge";
import ReviewForm from "@/components/ReviewForm";
import ReviewItem from "@/components/ReviewItem";
import Stars from "@/components/Stars";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";
import LocationEditDialog from "@/components/LocationEditDialog";
import { directionsUrl } from "@/services/geocode";
import RestaurantGallery from "@/components/RestaurantGallery";
import RestaurantMenus from "@/components/RestaurantMenus";
import { Tooltip } from "@/components/ui/tooltip";
import Avatar from "@/components/Avatar";
import AuthorButton from "@/components/AuthorButton";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_HEAD,
  SECTION_TITLE,
  SECTION_BODY_PAD,
  ADD_BUTTON,
} from "@/lib/sectionClasses";
import Beeeh from "@/sections/Beeeh";

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
    restaurant?.id,
  );
  // Ordre des tags : origines, puis caractéristiques, puis plats. Appelé ici
  // (avant les retours anticipés de chargement) pour respecter l'ordre des hooks.
  const tags = useSortedTags(restaurant?.tags);
  const [showForm, setShowForm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mapEditOpen, setMapEditOpen] = useState(false);

  // Remonte en haut quand on ouvre une nouvelle fiche. Corps de bloc obligatoire :
  // une flèche à expression retournerait la valeur de scrollTo, que React prendrait
  // pour une fonction de nettoyage (→ crash "destroy is not a function" au démontage).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  /* --------------------------- états de chargement --------------------------- */

  if (loading) {
    return (
      <div className="tw-scope flex h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    // Slug inexistant (pas d'erreur, juste aucun résultat) : easter egg 🐑.
    if (!error) return <Beeeh />;
    return (
      <div className="tw-scope mx-auto max-w-[1100px] py-16 text-center">
        <p className="text-foreground/70">{`Erreur : ${error}`}</p>
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

  const topRank = topRankOf(topRated, restaurant.id);
  const liked = favoriteIds.includes(restaurant.id);
  // Contributions (avis / photos / menus) : verrouillables indépendamment de la
  // fermeture. Le contenu déjà publié reste visible dans tous les cas.
  const canContribute = restaurant.contributions_enabled !== false;
  const visibleBadges = orderBadges(restaurant.badges);

  const totalReviews = reviews.length;
  const myReview = reviews.find((r) => r.user_id === userId) ?? null;
  // Tous les avis, y compris une note seule. Son propre avis toujours en
  // premier (comme YouTube), le reste inchangé.
  const sortedReviews = [...reviews].sort((a, b) => {
    if (a.user_id === userId) return -1;
    if (b.user_id === userId) return 1;
    return 0;
  });
  // Répartition par note (5→1) pour les barres type Amazon.
  const ratingCounts = (star: number) =>
    reviews.filter((r) => r.rating === star).length;
  // Moyenne brute des avis (pas la note bayésienne du classement : ici on
  // rend compte de ce que les collègues ont réellement mis).
  const averageRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const deleteReview = async (id: number) => {
    const { error } = await supabaseClient
      .from("reviews")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000,
      });
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
        className="mb-3 inline-flex sm:mb-4 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <FiArrowLeft className="h-4 w-4" /> Tous les restaurants
      </button>

      {/* Hero */}
      <div className="relative h-[220px] overflow-hidden rounded-card border border-border sm:h-[300px] md:h-[380px]">
        <img
          src={restaurant.image ?? noImage}
          alt={restaurant.name}
          className={cn(
            "h-full w-full object-cover",
            restaurant.closed && "grayscale",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {restaurant.closed && (
          <ClosedBadge className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4" />
        )}

        <TopBadge
          rank={topRank}
          size="lg"
          className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4"
        />

        <LikeButton
          liked={liked}
          onToggle={async (next) => {
            if (next) await addFavorite(restaurant.id);
            else await removeFavorite(restaurant.id);
          }}
          iconClassName="h-4 w-4 sm:h-5 sm:w-5"
          emptyClassName="text-foreground/60"
          className="absolute bottom-3 right-3 z-10 h-9 w-9 bg-card/85 shadow-md backdrop-blur hover:bg-card sm:bottom-5 sm:right-5 sm:h-11 sm:w-11 md:bottom-7 md:right-7"
        />

        {/* Bandeau bas */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 md:p-7">
          {tags.length > 0 && (
            <div className="mb-2 flex max-w-[16rem] flex-wrap gap-1 sm:mb-3 sm:gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm sm:px-2.5 sm:text-xs"
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
              className="font-display text-xl font-extrabold leading-tight text-white drop-shadow sm:text-3xl md:text-4xl"
            >
              {restaurant.name}
            </div>
            {isAdmin && (
              <Tooltip label="Modifier">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Modifier le restaurant"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30 sm:h-9 sm:w-9"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Atouts : petites icônes (sans texte, infobulles) en haut à droite. */}
        {visibleBadges.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex flex-wrap justify-end gap-1 sm:right-4 sm:top-4 sm:gap-1.5">
            {visibleBadges.map((b) => (
              <Tooltip key={b} label={b}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/85 shadow-sm backdrop-blur sm:h-9 sm:w-9">
                  <img
                    src={badgeMap[b]}
                    alt={b}
                    className="h-[18px] w-[18px] object-contain sm:h-6 sm:w-6"
                  />
                </span>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Déjeuner du jour : sous le hero pour ne jamais recouvrir le nom. Les
          collègues déjà inscrits s'affichent en éventail à gauche du bouton, à
          la même hauteur que lui. */}
      {restaurant.closed ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-card border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground/70 sm:mt-4 sm:px-4 sm:py-3">
          <FiSlash className="h-4 w-4 shrink-0 text-foreground/45" />
          {/* Mobile : version courte. */}
          <span className="sm:hidden">Restaurant fermé</span>
          <span className="hidden sm:inline">
            Ce restaurant a définitivement fermé. Sa fiche reste consultable,
            mais on ne peut plus y déjeuner.
          </span>
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2.5 sm:mt-4 sm:gap-3">
        {!restaurant.closed && (
          <>
            {/* Mobile : avatars à la taille des boutons ronds (36 px). */}
            <div className="sm:hidden">
              <LunchAvatars
                restaurantId={restaurant.id}
                size={36}
                max={5}
                interactive
              />
            </div>
            <div className="hidden sm:block">
              <LunchAvatars
                restaurantId={restaurant.id}
                size={42}
                max={5}
                interactive
              />
            </div>
            <LunchButton restaurantId={restaurant.id} />
          </>
        )}
        {/* Click & collect : la page de commande, dans un nouvel onglet. */}
        {!restaurant.closed && restaurant.order_url && (
          <OrderButton url={restaurant.order_url} />
        )}
        {/* Mobile : la section Carte est masquée → itinéraire direct. */}
        <a
          href={directionsUrl(
            restaurant.lat != null && restaurant.lng != null
              ? { lat: restaurant.lat, lng: restaurant.lng }
              : (restaurant.address ?? ""),
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Itinéraire"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground no-underline sm:hidden"
        >
          <FiMap className="h-4 w-4" />
        </a>
      </div>

      {/* Corps : 2 colonnes (les atouts sont dans le hero, en bas à droite).
          Sur mobile l'ordre est coordonnées → carte → photos → avis (order-2..4) ;
          à partir de lg, colonne gauche (photos + avis) et sidebar à droite
          (placement explicite col-start/row-start). */}
      <div className="mt-2.5 grid gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        {/* Colonne gauche (photos + avis). Desktop : flex col occupant 2/3.
            Mobile : display:contents pour que la sidebar (coordonnées + carte,
            order-2) s'intercale → infos → photos → avis. */}
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
          {/* Photos (galerie collaborateurs) */}
          <RestaurantGallery
            className="order-3"
            restaurantId={restaurant.id}
            slug={restaurant.slug}
            userId={userId}
            isAdmin={isAdmin}
            canContribute={canContribute}
          />

          {/* Avis */}
          <section className={cn("order-4", SECTION)}>
            <div className={SECTION_HEAD}>
              <div role="heading" aria-level={2} className={SECTION_TITLE}>
                Avis des collaborateurs
              </div>
              {canContribute && !myReview && !showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  aria-label="Écrire un avis"
                  className={ADD_BUTTON}
                >
                  <FiPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Écrire un avis</span>
                </button>
              )}
            </div>
            {/* Mobile : comme Photos et Menus, pas de cadre vide quand il n'y
                a aucun avis — l'en-tête et son bouton suffisent. */}
            <div
              className={cn(
                SECTION_BODY_PAD,
                !reviewsLoading &&
                  totalReviews === 0 &&
                  !(canContribute && showForm) &&
                  "hidden sm:block"
              )}
            >
              {canContribute && showForm && (
                <ReviewForm
                  restaurantId={restaurant.id}
                  existing={myReview}
                  onDone={() => setShowForm(false)}
                />
              )}

              {/* Moyenne en étoiles, puis répartition par note (type Amazon). */}
              {totalReviews > 0 && (
                <div className="mb-2.5 sm:mb-5 sm:rounded-xl sm:bg-muted/40 sm:p-4">
                  <div className="flex flex-wrap items-center gap-3 sm:mb-3">
                    <span className="font-display text-2xl sm:text-3xl font-bold leading-none tabular-nums text-card-foreground">
                      {averageRating.toFixed(1)}
                    </span>
                    <Stars rating={averageRating} size={22} />
                    <span className="text-sm text-foreground/55">
                      {totalReviews} avis
                    </span>
                  </div>
                  {/* Répartition par note : desktop seulement. */}
                  <div className="hidden space-y-1.5 sm:block">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingCounts(star);
                      const pct = totalReviews
                        ? (count / totalReviews) * 100
                        : 0;
                      return (
                        <div
                          key={star}
                          className="flex items-center gap-2 text-xs"
                        >
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
                </div>
              )}

              {/* Liste */}
              {reviewsLoading ? (
                <div className="flex justify-center py-5 sm:py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              ) : totalReviews === 0 ? (
                <p className="py-3 text-center text-sm text-foreground/55 sm:py-6">
                  Aucun avis pour le moment.
                  {canContribute && " Sois le premier à en laisser un !"}
                </p>
              ) : (
                <ul className="m-0 list-none space-y-3 p-0 sm:space-y-4">
                  {sortedReviews.map((r) => {
                    const mine = r.user_id === userId;
                    const avatar = (size: number) => (
                      // La photo aussi mène au profil.
                      <AuthorButton
                        userId={r.user_id}
                        email={r.email}
                        className="flex rounded-full leading-none transition-transform duration-150 hover:scale-105 hover:no-underline"
                      >
                        <Avatar
                          email={r.email}
                          avatarPath={r.avatar_path}
                          size={size}
                        />
                      </AuthorButton>
                    );
                    return (
                      <ReviewItem
                        key={r.id}
                        review={r}
                        leading={avatar}
                        title={
                          <AuthorButton
                            userId={r.user_id}
                            email={r.email}
                            className={cn(
                              "font-semibold",
                              mine ? "text-primary" : "text-card-foreground",
                            )}
                          />
                        }
                        onEdit={
                          mine && canContribute
                            ? () => setShowForm(true)
                            : undefined
                        }
                        onDelete={
                          mine || isAdmin ? () => deleteReview(r.id) : undefined
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar : coordonnées + carte. Indépendante (pas de row-span). */}
        {/* gap plutôt que space-y : la Carte masquée sur mobile n'ajoute pas de marge. */}
        <aside className="order-2 flex flex-col gap-3 self-start sm:gap-6 lg:col-start-3 lg:row-start-1">
          {/* Coordonnées */}
          <section className={SECTION}>
            <div className={SECTION_HEAD}>
              <div role="heading" aria-level={2} className={SECTION_TITLE}>
                Coordonnées
              </div>
            </div>
            <ul
              className={cn(
                SECTION_BODY_PAD,
                "m-0 list-none space-y-3 text-sm",
              )}
            >
              {restaurant.address && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">
                    {restaurant.address}
                  </span>
                </li>
              )}
              {(restaurant.phone || restaurant.website) && (
                /* Téléphone et site web côte à côte (retour à la ligne si trop étroit). */
                <li className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  {restaurant.phone && (
                    <span className="flex items-center gap-3">
                      <FiPhone className="h-4 w-4 shrink-0 text-primary" />
                      <a
                        href={`tel:${restaurant.phone}`}
                        className="text-foreground/80 transition hover:text-primary"
                      >
                        {restaurant.phone}
                      </a>
                    </span>
                  )}
                  {restaurant.website && (
                    <span className="flex min-w-0 items-center gap-3">
                      <FiGlobe className="h-4 w-4 shrink-0 text-primary" />
                      <a
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate text-foreground/80 transition hover:text-primary"
                      >
                        Site web <FiExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </span>
                  )}
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
            canContribute={canContribute}
          />

          {/* Carte (mobile : masquée, bouton Itinéraire sous le hero) */}
          <section className="hidden overflow-hidden rounded-card border border-border bg-card sm:block">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-5 sm:py-3">
              <div
                role="heading"
                aria-level={2}
                className="font-display text-base font-bold sm:text-lg text-card-foreground"
              >
                Carte
              </div>
              {isAdmin && (
                <Tooltip label="Modifier la position">
                  <button
                    type="button"
                    onClick={() => setMapEditOpen(true)}
                    aria-label="Modifier la position"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
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
            // Renommer le resto recalcule son slug : l'URL courante porte
            // l'ancien, devenu introuvable (easter egg 🐑). On suit la fiche.
            // `replace` : le bouton Retour ne doit pas ramener sur l'URL morte.
            // Comparaison brute — des slugs legacy en base ne se recalculent
            // pas avec les règles actuelles de slugify.
            onSuccess={(slug) => {
              setEditOpen(false);
              if (slug && slug !== restaurant.slug) {
                navigate(`/restaurant/${slug}`, { replace: true });
              }
              queryClient.invalidateQueries();
            }}
            // La fiche n'existe plus : on quitte la page avant de rafraîchir,
            // sinon le slug devenu introuvable affiche l'easter egg 🐑.
            onDeleted={() => {
              setEditOpen(false);
              navigate("/", { replace: true });
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

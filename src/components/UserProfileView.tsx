import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCamera, FiStar, FiAward, FiLock } from "react-icons/fi";
import { LuFlame, LuUtensils } from "react-icons/lu";
import { FLAMBE_STREAK } from "@/data/achievements";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import Avatar from "@/components/Avatar";
import usePublicProfile, {
  PublicPhoto,
  PublicProfile,
} from "@/hooks/usePublicProfile";
import useSession from "@/hooks/useSession";
import useIsAdmin from "@/hooks/useIsAdmin";
import PhotoGallery from "@/components/PhotoGallery";
import ReviewItem from "@/components/ReviewItem";
import ReviewForm from "@/components/ReviewForm";
import useUserReviews, { UserReview } from "@/hooks/useUserReviews";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image.jpg";
import useAchievements from "@/hooks/useAchievements";
import useAchievementStats from "@/hooks/useAchievementStats";
import useSecretConditions from "@/hooks/useSecretConditions";
import AchievementDialog from "@/components/AchievementDialog";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  Achievement,
} from "@/data/achievements";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_HEAD,
  SECTION_TITLE,
  SECTION_BODY,
  SECTION_BODY_PAD,
} from "@/lib/sectionClasses";

interface Props {
  userId: string;
  /** Profil de l'utilisateur connecté : tous ses succès lui sont révélés. */
  isMe?: boolean;
}

/** « septembre 2026 » : la précision du jour n'apporte rien pour une ancienneté. */
const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Profil public d'un collaborateur : qui c'est, depuis quand il est là, ses
 * succès et ses photos. Le même composant sert de première page de « Mon
 * Profil » (pour soi) et de page /profil/:id (pour les autres).
 */
/** Étincelles autour de la pp « Flambé » : position horizontale (% de la
 *  largeur, hors cercle = le long des bords), dérive, durée et délai. Fixes
 *  plutôt qu'aléatoires : rendu stable entre deux rendus. */
const SPARKS = [
  { x: -6, drift: -10, rise: 1.15, dur: 2.2, delay: 0, size: 4, color: "#fb923c" },
  { x: 4, drift: -6, rise: 1.0, dur: 1.8, delay: 0.6, size: 3, color: "#fde68a" },
  { x: 14, drift: -3, rise: 1.25, dur: 2.6, delay: 1.3, size: 3, color: "#fb923c" },
  { x: 50, drift: 2, rise: 1.3, dur: 2.4, delay: 0.3, size: 3, color: "#fde68a" },
  { x: 84, drift: 4, rise: 1.2, dur: 2.0, delay: 1.7, size: 3, color: "#fb923c" },
  { x: 96, drift: 7, rise: 1.05, dur: 1.9, delay: 0.9, size: 4, color: "#ea580c" },
  { x: 104, drift: 11, rise: 1.15, dur: 2.3, delay: 1.1, size: 3, color: "#fde68a" },
  { x: 30, drift: -4, rise: 1.35, dur: 2.8, delay: 2.0, size: 2, color: "#fb923c" },
  { x: 70, drift: 5, rise: 1.3, dur: 2.5, delay: 0.15, size: 2, color: "#fde68a" },
];

/**
 * Photo de profil avec la série de midis : à partir de 2 jours ouvrés d'affilée
 * (« pas au resto » compris), contour orange et pastille flamme + nombre.
 * L'Avatar rogne (overflow-hidden) : la pastille vit dans un cadre autour.
 */
const StreakAvatar = ({
  profile,
  size,
  className,
}: {
  profile: PublicProfile;
  size: number;
  className?: string;
}) => {
  const streak = profile.lunch_streak ?? 0;
  const onFire = streak >= 2;
  // Palier du succès « Flambé » : la pp prend feu (halo + étincelles).
  const flambe = streak >= FLAMBE_STREAK;
  return (
    <span
      className={cn("relative shrink-0", flambe && "streak-fire", className)}
      style={{ width: size, height: size }}
    >
      {flambe &&
        SPARKS.map((sp, i) => (
          <span
            key={i}
            aria-hidden
            className="streak-spark"
            style={
              {
                "--x": `${sp.x}%`,
                "--drift": `${sp.drift}px`,
                // Hauteur de montée relative à la pp : dépasse le sommet.
                "--rise": `${-Math.round(size * sp.rise)}px`,
                "--dur": `${sp.dur}s`,
                "--delay": `${sp.delay}s`,
                "--size": `${sp.size}px`,
                "--color": sp.color,
              } as React.CSSProperties
            }
          />
        ))}
      <Avatar
        email={profile.email}
        avatarPath={profile.avatar_path}
        size={size}
        className={cn("relative z-[1] ring-2", onFire ? "ring-accent" : "ring-border")}
      />
      {onFire && (
        <span
          aria-label={`${streak} midis d'affilée`}
          className="absolute -bottom-0.5 -right-0.5 z-[2] flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-accent pl-1 pr-1.5 text-xs leading-none text-white shadow ring-2 ring-card"
        >
          <LuFlame className="h-3 w-3" />
          {streak}
        </span>
      )}
    </span>
  );
};

const UserProfileView = ({ userId, isMe = false }: Props) => {
  const navigate = useNavigate();
  const { profile, photos, remove, setCaption } = usePublicProfile(userId);
  const { reviews, remove: removeReview } = useUserReviews(userId);
  // Son avis en cours d'édition (même dialog que sur la fiche resto).
  const [editing, setEditing] = useState<UserReview | null>(null);
  const { sessionData } = useSession();
  const viewerId = sessionData?.user?.id;
  const isAdmin = useIsAdmin();
  // Les succès du VISITEUR : on ne dévoile le contenu d'un succès que s'il
  // l'a lui-même obtenu — sinon il en voit ce que sa propre galerie en montre.
  const { unlockedIds: mine } = useAchievements();
  // Fiche d'un succès (clic sur une tuile) : condition si je l'ai aussi,
  // rareté, et qui l'a décroché.
  const [opened, setOpened] = useState<Achievement | null>(null);
  const { percentById, ready: statsReady } = useAchievementStats();
  const secretConditions = useSecretConditions();

  const data = profile.data;
  const unlocked = (data?.achievements ?? [])
    .map((a) => ({ ...a, def: ACHIEVEMENTS_BY_ID[a.achievement_id] }))
    // Un succès retiré du catalogue ne doit pas faire planter la page.
    .filter((a) => a.def)
    // Le dernier décroché en tête.
    .sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at));

  // Tous ses avis, note seule comprise (comme sur une fiche).
  const visibleReviews = reviews.data ?? [];

  const deleteReview = async (review: UserReview) => {
    try {
      await removeReview.mutateAsync(review);
      toast({ title: "Avis supprimé", status: "success", duration: 2500 });
    } catch (e) {
      toast({
        title: "Erreur",
        description: (e as Error).message,
        status: "error",
        duration: 5000,
      });
    }
  };

  if (profile.isPending) {
    return (
      <Card className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </Card>
    );
  }

  if (profile.error || !data) {
    return (
      <Card className="p-4 sm:p-8 text-center text-sm text-foreground/55">
        Profil introuvable.
      </Card>
    );
  }

  return (
    <>
      {/* Identité : avatar, nom, ancienneté, compteurs. */}
      <Card className="p-4 sm:p-8">
        <div className="flex items-center gap-4 text-left">
          {/* Mobile : pp plus petite. */}
          <StreakAvatar profile={data} size={64} className="sm:hidden" />
          <StreakAvatar profile={data} size={96} className="hidden sm:block" />
          <div className="min-w-0 flex-1">
            <div
              role="heading"
              aria-level={2}
              className="truncate font-display text-xl sm:text-2xl font-bold text-card-foreground"
            >
              {formatAuthorName(data.email)}
            </div>
            <p className="mb-0 mt-0.5 text-[13px] text-foreground/55 sm:text-sm">
              Membre depuis {formatMonth(data.member_since)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70 sm:mt-3 sm:gap-x-5">
              <span className="inline-flex items-center gap-1.5">
                <FiStar className="h-4 w-4 text-primary" />
                {data.reviews_count}
                <span className="hidden sm:inline">avis</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiCamera className="h-4 w-4 text-primary" />
                {data.photos_count}
                <span className="hidden sm:inline">
                  photo{data.photos_count > 1 ? "s" : ""}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LuUtensils className="h-4 w-4 text-primary" />
                {data.lunches_count}
                <span className="hidden sm:inline">
                  midi{data.lunches_count > 1 ? "s" : ""}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiAward className="h-4 w-4 text-primary" />
                {unlocked.length}/{ACHIEVEMENTS.length}
                <span className="hidden sm:inline">succès</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Succès obtenus par la personne. Ce qu'on en voit dépend du visiteur :
          le contenu d'un succès ne se dévoile qu'à qui l'a lui-même décroché. */}
      {unlocked.length > 0 && (
        <section
          className={cn(
            SECTION,
            "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
          )}
        >
          <div className={SECTION_HEAD}>
            <div role="heading" aria-level={2} className={SECTION_TITLE}>
              Succès
              <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
                {unlocked.length}/{ACHIEVEMENTS.length}
              </span>
            </div>
          </div>
          <div className={SECTION_BODY}>
            {unlocked.length === 0 ? (
              <p className="mb-0 text-sm text-foreground/50">
                Aucun succès débloqué pour le moment.
              </p>
            ) : (
              /* Mobile : bandeau horizontal à défilement libre.
               Desktop : rangée centrée, titre en infobulle. */
              <ul
                // Le défilement du bandeau ne doit pas passer pour un balayage
                // de changement d'onglet (Mon compte) : cf. useSwipeTabs.
                data-no-swipe
                className="m-0 flex list-none gap-2 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-2 sm:overflow-visible sm:p-0"
              >
                {unlocked.map(({ def, unlocked_at }) => {
                  // Même règle que la galerie : l'image seulement si le visiteur
                  // l'a aussi, sinon cadenas. Le reste tient dans l'infobulle —
                  // titre et date d'obtention — pour une rangée légère.
                  const known = isMe || mine.includes(def.id);
                  return (
                    <li key={def.id} className="shrink-0">
                      <Tooltip
                        label={
                          <span className="block text-center">
                            <span className="block font-semibold">
                              {def.title}
                            </span>
                            <span className="block text-[11px] opacity-70">
                              {formatDate(unlocked_at)}
                            </span>
                          </span>
                        }
                      >
                        {/* Tactile : pas de bulle, c'est la fiche qui
                            s'ouvre au tap et porte titre et date. */}
                        <button
                          type="button"
                          onClick={() => setOpened(def)}
                          aria-label={`${def.title}, obtenu le ${formatDate(unlocked_at)}`}
                          className={cn(
                            "flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-border p-1.5 text-2xl outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-14 sm:w-14 sm:p-2 sm:text-3xl",
                            known
                              ? cn(
                                  "bg-background",
                                  !def.image && "bg-primary/10",
                                )
                              : "bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {!known ? (
                            <FiLock className="h-7 w-7" />
                          ) : def.image ? (
                            <img
                              src={def.image}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            def.icon
                          )}
                        </button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Photos : les mêmes vignettes et la même visionneuse que sur une fiche
          resto, en grille 3 par ligne façon Instagram, le nom du restaurant à
          la place de celui de l'auteur. Sans photo, la section est omise. */}
      {(photos.isPending || (photos.data ?? []).length > 0) && (
        <section
          className={cn(
            SECTION,
            "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
          )}
        >
          <div className={SECTION_HEAD}>
            <div role="heading" aria-level={2} className={SECTION_TITLE}>
              Photos
              {(photos.data ?? []).length > 0 && (
                <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
                  ({photos.data?.length})
                </span>
              )}
            </div>
          </div>
          <div className={SECTION_BODY}>
            {photos.isPending ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : (photos.data ?? []).length === 0 ? (
              <p className="mb-0 text-sm text-foreground/50">
                Aucune photo publiée.
              </p>
            ) : (
              <PhotoGallery
                photos={photos.data ?? []}
                userId={sessionData?.user?.id}
                isAdmin={isAdmin}
                labelOf={(photo) =>
                  (photo as PublicPhoto).restaurant?.name ??
                  "Restaurant indisponible"
                }
                onLabelClick={(photo) => {
                  const slug = (photo as PublicPhoto).restaurant?.slug;
                  if (slug) navigate(`/restaurant/${slug}`);
                }}
                layout="grid"
                onDelete={(photo) => remove.mutateAsync(photo)}
                onSetCaption={(photo, caption) =>
                  setCaption.mutateAsync({ id: photo.id, caption })
                }
              />
            )}
          </div>
        </section>
      )}
      {/* Avis : la même mise en forme que sur une fiche resto, le restaurant
          (vignette + nom, cliquables) à la place de l'auteur. Sans avis, la
          section est omise. */}
      {(reviews.isPending || visibleReviews.length > 0) && (
        <section
          className={cn(
            SECTION,
            "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
          )}
        >
          <div className={SECTION_HEAD}>
            <div role="heading" aria-level={2} className={SECTION_TITLE}>
              Avis
              {visibleReviews.length > 0 && (
                <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
                  ({visibleReviews.length})
                </span>
              )}
            </div>
          </div>
          <div className={SECTION_BODY_PAD}>
            {reviews.isPending ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : (
              /* Pas de filet au-dessus du premier : ici rien ne le précède
                 (sur une fiche, c'est le bloc de la note). */
              <ul className="m-0 list-none space-y-3 p-0 sm:space-y-4 [&>li:first-child]:border-t-0 [&>li:first-child]:pt-0">
                {visibleReviews.map((r) => {
                  const mine = r.user_id === viewerId;
                  const slug = r.restaurant?.slug;
                  const goToRestaurant = slug
                    ? () => navigate(`/restaurant/${slug}`)
                    : undefined;
                  return (
                    <ReviewItem
                      key={r.id}
                      review={r}
                      leading={(size) => (
                        <button
                          type="button"
                          onClick={goToRestaurant}
                          aria-label={r.restaurant?.name ?? "Restaurant indisponible"}
                          className="flex shrink-0 overflow-hidden rounded-full leading-none transition-transform duration-150 hover:scale-105"
                          style={{ height: size, width: size }}
                        >
                          <img
                            src={r.restaurant?.image ?? noImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}
                      title={
                        <button
                          type="button"
                          onClick={goToRestaurant}
                          className={cn(
                            "m-0 cursor-pointer p-0 text-left font-semibold underline-offset-2 hover:underline",
                            mine ? "text-primary" : "text-card-foreground",
                          )}
                        >
                          {r.restaurant?.name ?? "Restaurant indisponible"}
                        </button>
                      }
                      onEdit={
                        mine && r.restaurant?.contributions_enabled !== false
                          ? () => setEditing(r)
                          : undefined
                      }
                      onDelete={
                        mine || isAdmin ? () => deleteReview(r) : undefined
                      }
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {editing && (
        <ReviewForm
          restaurantId={editing.restaurant_id}
          existing={editing}
          onDone={() => setEditing(null)}
        />
      )}

      <AchievementDialog
        isOpen={!!opened}
        onClose={() => setOpened(null)}
        achievement={opened}
        unlocked={!!opened && (isMe || mine.includes(opened.id))}
        condition={
          opened ? (opened.condition ?? secretConditions[opened.id]) : undefined
        }
        percent={statsReady && opened ? (percentById[opened.id] ?? 0) : undefined}
      />
    </>
  );
};

export default UserProfileView;

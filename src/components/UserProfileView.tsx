import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCamera, FiStar, FiAward, FiLock } from "react-icons/fi";
import { LuUtensils } from "react-icons/lu";
import { RARE_PERCENT } from "@/data/achievements";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import StreakAvatar from "@/components/StreakAvatar";
import usePublicProfile, { PublicPhoto } from "@/hooks/usePublicProfile";
import useSession from "@/hooks/useSession";
import useIsAdmin from "@/hooks/useIsAdmin";
import PhotoGallery from "@/components/PhotoGallery";
import ReviewItem from "@/components/ReviewItem";
import ReviewForm from "@/components/ReviewForm";
import useUserReviews, { UserReview } from "@/hooks/useUserReviews";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image.jpg";
import { resizedImgProps, IMG_THUMB } from "@/lib/imageUrl";
import useAchievements from "@/hooks/useAchievements";
import useAchievementStats from "@/hooks/useAchievementStats";
import useSecretConditions from "@/hooks/useSecretConditions";
import AchievementDialog from "@/components/AchievementDialog";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  Achievement,
  canonicalId,
} from "@/data/achievements";
import useUserNames from "@/hooks/useUserNames";
import { cn } from "@/lib/utils";
import RareRing from "@/components/RareRing";
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

const UserProfileView = ({ userId, isMe = false }: Props) => {
  const { nameOf } = useUserNames();
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
    .map((a) => ({ ...a, def: ACHIEVEMENTS_BY_ID[canonicalId(a.achievement_id)] }))
    // Un succès retiré du catalogue ne doit pas faire planter la page.
    .filter((a) => a.def)
    // Un même succès peut exister en base sous son ancien id ET le nouveau
    // (renommage pas encore migré) : une seule fois, à la date la plus
    // ancienne — sinon le compteur dépassait le total (31/30).
    .sort((a, b) => a.unlocked_at.localeCompare(b.unlocked_at))
    .filter((a, i, all) => all.findIndex((x) => x.def === a.def) === i)
    // Dans l'ordre du catalogue.
    .sort(
      (a, b) => ACHIEVEMENTS.indexOf(a.def) - ACHIEVEMENTS.indexOf(b.def),
    );
  // Une case par succès du catalogue, vide (null) si la personne ne l'a pas.
  const slots = ACHIEVEMENTS.map(
    (def) => unlocked.find((a) => a.def === def) ?? null,
  );

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
          <StreakAvatar email={data.email} avatarPath={data.avatar_path} streak={data.lunch_streak ?? 0} size={64} className="sm:hidden" />
          <StreakAvatar email={data.email} avatarPath={data.avatar_path} streak={data.lunch_streak ?? 0} size={96} className="hidden sm:block" />
          <div className="min-w-0 flex-1">
            <div
              role="heading"
              aria-level={2}
              className="truncate font-display text-xl sm:text-2xl font-bold text-card-foreground"
            >
              {nameOf(data.email)}
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
              /* Mobile : bandeau horizontal à défilement libre verrouillé à
               l'horizontale : touch-pan-x pour le doigt, overflow-y-hidden car
               overflow-x-auto passerait sinon overflow-y en auto.
               Desktop : grille de 9 par ligne sur toute la largeur, titre en
               infobulle. */
              <ul
                // Le défilement du bandeau ne doit pas passer pour un balayage
                // de changement d'onglet (Mon compte) : cf. useSwipeTabs.
                data-no-swipe
                className="m-0 flex list-none gap-2 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-9 sm:gap-2 sm:touch-auto sm:overflow-visible sm:p-0"
              >
                {slots.map((slot, i) => {
                  // Succès que la personne n'a pas encore : cadre vide, à sa
                  // place dans le catalogue.
                  if (!slot)
                    return (
                      <li key={`vide-${i}`} aria-hidden className="shrink-0">
                        <div className="h-14 w-14 rounded-xl border border-dashed border-border bg-muted/40 sm:aspect-square sm:h-auto sm:w-full" />
                      </li>
                    );
                  const { def, unlocked_at } = slot;
                  // Même règle que la galerie : l'image seulement si le visiteur
                  // l'a aussi, sinon cadenas. Le reste tient dans l'infobulle —
                  // titre et date d'obtention — pour une rangée légère.
                  const known = isMe || mine.includes(def.id);
                  return (
                    <li key={def.id} className="shrink-0">
                      <Tooltip
                        disabled={opened !== null}
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
                            "flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border border-border p-0.5 text-3xl outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 sm:aspect-square sm:h-auto sm:w-full sm:p-1 sm:text-3xl",
                            known
                              ? cn(
                                  "bg-background",
                                  !def.image && "bg-primary/10",
                                )
                              : "bg-muted/40 text-muted-foreground",
                            // Rare : aura dorée, que le visiteur l'ait ou non.
                            statsReady &&
                              (percentById[def.id] ?? 0) < RARE_PERCENT &&
                              "rare-aura",
                          )}
                        >
                          {statsReady &&
                            (percentById[def.id] ?? 0) < RARE_PERCENT && <RareRing />}
                          {!known ? (
                            <FiLock className="h-7 w-7" />
                          ) : def.image ? (
                            <img
                              loading="lazy"
                              data-fade
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
                            loading="lazy"
                            data-fade
                            {...resizedImgProps(r.restaurant?.image ?? noImage, IMG_THUMB)}
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
        // Ouverte depuis la grille : la personne du profil l'a forcément.
        owned
        condition={
          opened ? (opened.condition ?? secretConditions[opened.id]) : undefined
        }
        percent={statsReady && opened ? (percentById[opened.id] ?? 0) : undefined}
      />
    </>
  );
};

export default UserProfileView;

import { useNavigate } from "react-router-dom";
import { FiCamera, FiStar, FiAward, FiLock } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import Avatar from "@/components/Avatar";
import usePublicProfile, { PublicPhoto } from "@/hooks/usePublicProfile";
import useSession from "@/hooks/useSession";
import useIsAdmin from "@/hooks/useIsAdmin";
import PhotoGallery from "@/components/PhotoGallery";
import useAchievements from "@/hooks/useAchievements";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const { profile, photos, remove, setCaption } = usePublicProfile(userId);
  const { sessionData } = useSession();
  const isAdmin = useIsAdmin();
  // Les succès du VISITEUR : on ne dévoile le contenu d'un succès que s'il
  // l'a lui-même obtenu — sinon il en voit ce que sa propre galerie en montre.
  const { unlockedIds: mine } = useAchievements();

  const data = profile.data;
  const unlocked = (data?.achievements ?? [])
    .map((a) => ({ ...a, def: ACHIEVEMENTS_BY_ID[a.achievement_id] }))
    // Un succès retiré du catalogue ne doit pas faire planter la page.
    .filter((a) => a.def)
    // Le dernier décroché en tête.
    .sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at));

  if (profile.isPending) {
    return (
      <Card className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </Card>
    );
  }

  if (profile.error || !data) {
    return (
      <Card className="p-8 text-center text-sm text-foreground/55">
        Profil introuvable.
      </Card>
    );
  }

  return (
    <>
      {/* Identité : avatar, nom, ancienneté, compteurs. */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-4 text-left">
          <Avatar
            email={data.email}
            avatarPath={data.avatar_path}
            size={96}
            className="ring-2 ring-border"
          />
          <div className="min-w-0 flex-1">
            <div
              role="heading"
              aria-level={2}
              className="truncate font-display text-2xl font-bold text-card-foreground"
            >
              {formatAuthorName(data.email)}
            </div>
            <p className="mb-0 mt-0.5 text-sm text-foreground/55">
              Membre depuis {formatMonth(data.member_since)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-foreground/70">
              <span className="inline-flex items-center gap-1.5">
                <FiStar className="h-4 w-4 text-primary" />
                {data.reviews_count} avis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiCamera className="h-4 w-4 text-primary" />
                {data.photos_count} photo{data.photos_count > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiAward className="h-4 w-4 text-primary" />
                {unlocked.length}/{ACHIEVEMENTS.length} succès
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Succès obtenus par la personne. Ce qu'on en voit dépend du visiteur :
          le contenu d'un succès ne se dévoile qu'à qui l'a lui-même décroché. */}
      <Card className="p-6">
        <div
          role="heading"
          aria-level={2}
          className="mb-4 font-display text-lg font-bold text-card-foreground"
        >
          Succès
          <span className="ml-2 text-sm font-medium text-foreground/45">
            {unlocked.length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        {unlocked.length === 0 ? (
          <p className="mb-0 text-sm text-foreground/50">
            Aucun succès débloqué pour le moment.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
            {unlocked.map(({ def, unlocked_at }) => {
              // Même règle que la galerie : l'image seulement si le visiteur
              // l'a aussi, sinon cadenas. Le reste tient dans l'infobulle —
              // titre et date d'obtention — pour une rangée légère.
              const known = isMe || mine.includes(def.id);
              return (
                <li key={def.id}>
                  <Tooltip
                    keepOnClick
                    label={
                      <span className="block text-center">
                        <span className="block font-semibold">{def.title}</span>
                        <span className="block text-[11px] opacity-70">
                          {formatDate(unlocked_at)}
                        </span>
                      </span>
                    }
                  >
                    <div
                      tabIndex={0}
                      aria-label={`${def.title}, obtenu le ${formatDate(unlocked_at)}`}
                      className={cn(
                        "grid h-14 w-14 place-items-center rounded-xl border border-border p-2 text-3xl outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40",
                        known
                          ? cn("bg-background", !def.image && "bg-primary/10")
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {!known ? (
                        <FiLock className="h-7 w-7" />
                      ) : def.image ? (
                        <img src={def.image} alt="" className="h-full w-full object-contain" />
                      ) : (
                        def.icon
                      )}
                    </div>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Photos : les mêmes vignettes et la même visionneuse que sur une fiche
          resto, en grille 3 par ligne façon Instagram, le nom du restaurant à
          la place de celui de l'auteur. */}
      <Card className="p-6">
        <div
          role="heading"
          aria-level={2}
          className="mb-4 font-display text-lg font-bold text-card-foreground"
        >
          Photos
          {(photos.data ?? []).length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
              ({photos.data?.length})
            </span>
          )}
        </div>
        {photos.isPending ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (photos.data ?? []).length === 0 ? (
          <p className="mb-0 text-sm text-foreground/50">Aucune photo publiée.</p>
        ) : (
          <PhotoGallery
            photos={photos.data ?? []}
            userId={sessionData?.user?.id}
            isAdmin={isAdmin}
            labelOf={(photo) =>
              (photo as PublicPhoto).restaurant?.name ?? "Restaurant indisponible"
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
      </Card>
    </>
  );
};

export default UserProfileView;

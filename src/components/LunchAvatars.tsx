import Avatar from "@/components/Avatar";
import AuthorButton from "@/components/AuthorButton";
import { Tooltip } from "@/components/ui/tooltip";
import { formatAuthorName } from "@/utils/authorName";
import useLunchToday from "@/hooks/useLunchToday";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  /** Nombre d'avatars affichés avant le « +N ». */
  max?: number;
  /** Taille des avatars en px. */
  size?: number;
  className?: string;
  /** Fiche resto : avatars côte à côte, chacun nommé en infobulle et menant au
   *  profil. Sur une card, l'éventail compact suffit. */
  interactive?: boolean;
}

/**
 * Avatars des collègues qui déjeunent dans ce restaurant aujourd'hui. Ne rend
 * rien tant que personne ne s'est déclaré : la pastille n'apparaît que
 * lorsqu'il y a quelque chose à montrer.
 */
const LunchAvatars = ({
  restaurantId,
  max = 3,
  size = 24,
  className,
  interactive = false,
}: Props) => {
  const { byRestaurant } = useLunchToday();
  const people = byRestaurant.get(restaurantId) ?? [];
  if (people.length === 0) return null;

  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  if (interactive) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        {shown.map((p) => (
          <Tooltip key={p.user_id} label={formatAuthorName(p.email)}>
            {/* `flex` : la boîte du bouton épouse l'avatar. Au survol,
                l'avatar grossit un peu — pas de contour, juste un relief. */}
            <AuthorButton
              userId={p.user_id}
              email={p.email}
              className="flex rounded-full leading-none transition-transform duration-150 hover:scale-110 hover:no-underline"
            >
              <Avatar email={p.email} avatarPath={p.avatar_path} size={size} />
            </AuthorButton>
          </Tooltip>
        ))}
        {extra > 0 && (
          <span
            style={{ height: size, width: size, fontSize: Math.round(size * 0.38) }}
            className="flex shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground/70"
          >
            +{extra}
          </span>
        )}
      </span>
    );
  }

  return (
    <Tooltip label={people.length > 1 ? "Déjeunent ici" : "Déjeune ici"}>
      <span className={cn("inline-flex items-center -space-x-2", className)}>
        {shown.map((p) => (
          <Avatar
            key={p.user_id}
            email={p.email}
            avatarPath={p.avatar_path}
            size={size}
          />
        ))}
        {extra > 0 && (
          <span
            style={{ height: size, width: size, fontSize: Math.round(size * 0.38) }}
            className="flex shrink-0 items-center justify-center rounded-full bg-card font-bold text-foreground/70"
          >
            +{extra}
          </span>
        )}
      </span>
    </Tooltip>
  );
};

export default LunchAvatars;

import Avatar from "@/components/Avatar";
import { Tooltip } from "@/components/ui/tooltip";
import useLunchToday from "@/hooks/useLunchToday";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  /** Nombre d'avatars affichés avant le « +N ». */
  max?: number;
  /** Taille des avatars en px. */
  size?: number;
  className?: string;
}

/**
 * Avatars empilés des collègues qui déjeunent dans ce restaurant aujourd'hui.
 * Ne rend rien tant que personne ne s'est déclaré : la pastille n'apparaît que
 * lorsqu'il y a quelque chose à montrer.
 */
const LunchAvatars = ({ restaurantId, max = 3, size = 24, className }: Props) => {
  const { byRestaurant } = useLunchToday();
  const people = byRestaurant.get(restaurantId) ?? [];
  if (people.length === 0) return null;

  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

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
            className="grid shrink-0 place-items-center rounded-full bg-card font-bold text-foreground/70"
          >
            +{extra}
          </span>
        )}
      </span>
    </Tooltip>
  );
};

export default LunchAvatars;

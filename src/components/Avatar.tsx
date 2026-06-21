import { avatarUrl } from "@/services/avatar";
import { authorInitials } from "@/utils/authorName";
import { cn } from "@/lib/utils";

// Palette douce et déterministe pour les avatars par défaut (initiales).
const avatarColors = [
  "bg-sky-500/15 text-sky-600",
  "bg-violet-500/15 text-violet-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
];
export const avatarColor = (key: string) =>
  avatarColors[(key.charCodeAt(0) || 0) % avatarColors.length];

interface Props {
  email?: string | null;
  /** profiles.avatar_path : chemin de la pp perso (null ⇒ initiales). */
  avatarPath?: string | null;
  /** Taille en px (carré). */
  size?: number;
  className?: string;
}

/**
 * Avatar d'un utilisateur : photo de profil personnalisée si elle existe,
 * sinon initiales colorées (dérivées de l'email).
 */
const Avatar = ({ email, avatarPath, size = 40, className }: Props) => {
  const url = avatarUrl(avatarPath);
  const dim = { height: size, width: size };

  if (url) {
    // Image rendue telle quelle, sans gating JS d'opacité (onLoad/decode) : une
    // image en cache peut être prête avant l'attache du handler → la pp restait
    // invisible (cercle vide) lors des transitions SPA. Fond neutre le temps du
    // chargement initial.
    return (
      <span
        style={dim}
        className={cn(
          "relative block shrink-0 overflow-hidden rounded-full bg-muted",
          className
        )}
      >
        <img src={url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <div
      style={{ ...dim, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        avatarColor(email ?? "?"),
        className
      )}
    >
      {authorInitials(email)}
    </div>
  );
};

export default Avatar;

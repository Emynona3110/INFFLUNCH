import { LuFlame } from "react-icons/lu";
import { FLAMBE_STREAK } from "@/data/achievements";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

/** Étincelles autour de la pp « Tout feu tout flamme » : position horizontale (% de la
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
/** À partir de ce nombre de midis d'affilée, la flamme passe au bleu, puis au
 *  violet. */
const BLUE_FLAME_STREAK = 15;
const VIOLET_FLAME_STREAK = 30;
const BLUE_SPARK: Record<string, string> = {
  "#fb923c": "#60a5fa",
  "#fde68a": "#e0f2fe",
  "#ea580c": "#2563eb",
};
const VIOLET_SPARK: Record<string, string> = {
  "#fb923c": "#a78bfa",
  "#fde68a": "#ede9fe",
  "#ea580c": "#7c3aed",
};

const StreakAvatar = ({
  email,
  avatarPath,
  streak,
  size,
  className,
  compact = false,
}: {
  email: string | null;
  avatarPath: string | null;
  /** Série de midis en cours (lunch_streak). */
  streak: number;
  size: number;
  className?: string;
  /** Petite pp (liste du classement) : ni pastille chiffrée, ni grand
   *  effet — halo resserré et étincelles réduites. */
  compact?: boolean;
}) => {
  // Échelle des étincelles (taille, dérive, montée).
  const k = compact ? 0.6 : 1;
  const onFire = streak >= 2;
  // Palier du succès « Tout feu tout flamme » : la pp prend feu (halo + étincelles).
  const flambe = streak >= FLAMBE_STREAK;
  const violet = streak >= VIOLET_FLAME_STREAK;
  const blue = !violet && streak >= BLUE_FLAME_STREAK;
  return (
    <span
      className={cn("relative block shrink-0", flambe && "streak-fire", flambe && compact && "streak-fire-sm", blue && "streak-fire-blue", violet && "streak-fire-violet", className)}
      // `block` : un span en ligne ignore width/height — dans un parent qui
      // n'est pas flex (cellule du classement), la boîte faisait 0 de large
      // et halo + étincelles (placés en %) se tassaient à gauche (iOS).
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
                "--drift": `${sp.drift * k}px`,
                // Hauteur de montée relative à la pp : dépasse le sommet.
                "--rise": `${-Math.round(size * sp.rise * k)}px`,
                "--dur": `${sp.dur}s`,
                "--delay": `${sp.delay}s`,
                "--size": `${Math.max(1.5, sp.size * k)}px`,
                "--color": violet
                  ? VIOLET_SPARK[sp.color]
                  : blue
                    ? BLUE_SPARK[sp.color]
                    : sp.color,
              } as React.CSSProperties
            }
          />
        ))}
      <Avatar
        email={email}
        avatarPath={avatarPath}
        size={size}
        className={cn("relative z-[1] ring-2", violet ? "ring-violet-600" : blue ? "ring-blue-500" : onFire ? "ring-accent" : "ring-border")}
      />
      {onFire && !compact && (
        <span
          aria-label={`${streak} midis d'affilée`}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 z-[2] flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full pl-1 pr-1.5 text-xs leading-none text-white shadow ring-2 ring-card",
            violet ? "bg-violet-600" : blue ? "bg-blue-500" : "bg-accent",
          )}
        >
          <LuFlame className="h-3 w-3" />
          {streak}
        </span>
      )}
    </span>
  );
};

export default StreakAvatar;

import { FaStar } from "react-icons/fa";
import { cn } from "@/lib/utils";

/**
 * Note en étoiles (fiche resto, avis, profil). Même règle que sur les cards :
 * dès qu'il y a une décimale, demi-étoile.
 * `pulse` (easter egg Shooting Stars) : index d'étoile → clé du dernier clic.
 * Chaque étoile présente joue son bond lumineux indépendamment (plusieurs en
 * même temps possible) ; une nouvelle clé rejoue l'animation.
 */
const Stars = ({
  rating,
  size = 18,
  className,
  onClick,
  pulse,
}: {
  rating: number;
  size?: number;
  className?: string;
  /** Optionnel (easter egg) : rend les étoiles cliquables (curseur pointer). */
  onClick?: () => void;
  pulse?: Record<number, number>;
}) => {
  const value = rating ?? 0;
  const rounded = Math.floor(value) + (value % 1 === 0 ? 0 : 0.5);
  return (
    <span
      className={cn(
        "inline-flex gap-px select-none",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rounded - i)); // 0 | 0.5 | 1
        return (
          <span
            // Remonter l'élément relance l'animation à chaque clic.
            key={pulse?.[i] ? `${i}-${pulse[i]}` : i}
            className={cn("relative inline-flex", pulse?.[i] && "stars-pulse")}
            style={{ height: size, width: size }}
          >
            <FaStar
              className="text-black/15 dark:text-white/20"
              style={{ height: size, width: size }}
            />
            {fill > 0 && (
              <FaStar
                className="absolute inset-0 text-amber-500"
                style={{
                  height: size,
                  width: size,
                  clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
};

export default Stars;

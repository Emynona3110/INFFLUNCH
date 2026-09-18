import { FaStar } from "react-icons/fa";

/**
 * Note en étoiles (fiche resto, avis, profil). Même règle que sur les cards :
 * dès qu'il y a une décimale, demi-étoile.
 */
const Stars = ({ rating, size = 18 }: { rating: number; size?: number }) => {
  const value = rating ?? 0;
  const rounded = Math.floor(value) + (value % 1 === 0 ? 0 : 0.5);
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
};

export default Stars;

import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface Props {
  /** Note courante (0 = non notée). */
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Sélecteur de note 1→5 étoiles (survol = aperçu). Défaut 0 (non noté). */
const StarRatingInput = ({ value, onChange, size = 28 }: Props) => {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="cursor-pointer p-0.5 transition hover:scale-110"
        >
          <FaStar
            style={{ height: size, width: size }}
            className={cn(
              "transition-colors",
              n <= active ? "text-amber-500" : "text-black/15 dark:text-white/20"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRatingInput;

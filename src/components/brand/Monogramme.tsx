import { useEffect, useState, type AnimationEvent } from "react";
import { shouldPlayIntro } from "./introOnce";
import "./Logo.css";

const INTRO_DURATION = 1700; // ms

const P = {
  fork: "M19.393 42.443 L22.533 41.187 V54 A1.6 1.6 0 0 0 25.733 54 V39.907 L30.267 38.093 V54 A1.6 1.6 0 0 0 33.467 54 V36.813 L36.607 35.557 Q38 35 38 36.5 V73 A7 7 0 0 1 31 80 H25 A7 7 0 0 1 18 73 V44.5 Q18 43 19.393 42.443 Z",
  dot: "M19.393 27.443 L36.607 20.557 Q38 20 38 21.5 V28.5 Q38 30 36.607 30.557 L19.393 37.443 Q18 38 18 36.5 V29.5 Q18 28 19.393 27.443 Z",
  knife: "M51 80 A7 7 0 0 1 44 73 V21.5 Q44 20.1 45.4 20.4 C55 22.5 64 31 64 43 V73 A7 7 0 0 1 57 80 Z",
};

type Props = {
  /** Hauteur en px. */
  size?: number;
  /** Couleur des lettres ; par défaut celle du texte (thème clair/sombre via Tailwind). */
  color?: string;
  /** Couleur du point. */
  accent?: string;
  className?: string;
  /** false : jamais d'intro (espace admin), seulement le saut au clic. */
  playIntro?: boolean;
};

/**
 * Monogramme infflunch (en-tête mobile).
 * - Intro à chaque chargement de page : fourchette et couteau sortent,
 *   le point sort avec la fourchette et décolle sur son élan.
 * - Au clic (souris) ou au toucher (doigt) : les couverts s'écartent et lancent le point,
 *   qui retombe sur la fourchette avant que les couverts trinquent.
 *
 * props : size (hauteur en px), color (couverts), accent (point), className
 */
export default function Monogramme({ size = 36, color = "currentColor", accent = "#EA580C", className = "", playIntro = true }: Props) {
  const [intro, setIntro] = useState(() => playIntro && shouldPlayIntro());
  const [hop, setHop] = useState(false);

  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(false), INTRO_DURATION);
    return () => clearTimeout(t);
  }, [intro]);

  const playHop = () => {
    if (!intro && !hop) setHop(true);
  };

  const endHop = (e: AnimationEvent<SVGSVGElement>) => {
    if (hop && e.animationName === "infflunch-hop-knife") setHop(false);
  };

  const classes = [
    "infflunch-logo",
    "infflunch-logo--mono",
    intro && "infflunch-logo--intro",
    hop && "infflunch-logo--hop",
    className,
  ].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      viewBox="12 16 58 68"
      height={size}
      role="img"
      aria-label="infflunch"
      onPointerDown={playHop}
      onAnimationEnd={endHop}
    >
      <g className="il-letter">
        <g className="il-fork">
          <path fill={color} d={P.fork} />
          <path className="il-dot" fill={accent} d={P.dot} />
        </g>
      </g>
      <g className="il-letter" style={{ animationDelay: "0.12s" }}>
        <g className="il-knife">
          <path fill={color} d={P.knife} />
        </g>
      </g>
    </svg>
  );
}

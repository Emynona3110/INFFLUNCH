import { useEffect, useState, type AnimationEvent } from "react";
import { shouldPlayIntro } from "./introOnce";
import { MONO as P } from "./logoPaths";
import "./Logo.css";

const INTRO_DURATION = 1100; // ms

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

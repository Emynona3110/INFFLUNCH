import { useEffect, useId, useState, type AnimationEvent, type CSSProperties } from "react";
import { shouldPlayIntro } from "./introOnce";
import { ADMIN_LETTERS, ADMIN_SHIFT, LETTERS, P } from "./logoPaths";
import "./Logo.css";

const INTRO_DURATION = 1400; // ms, durée totale de l'intro
const LETTER_STEP = 0.08; // s, écart entre deux lettres à l'intro

type Props = {
  /** Hauteur en px. */
  height?: number;
  /** Couleur des lettres ; par défaut celle du texte (thème clair/sombre via Tailwind). */
  color?: string;
  /** Couleur du point. */
  accent?: string;
  className?: string;
  /** false : jamais d'intro (espace admin), seulement le saut au clic. */
  playIntro?: boolean;
  /** Version ADMINFFLUNCH : « adm » orange en tête. */
  admin?: boolean;
};

/**
 * Logotype infflunch (ou adminfflunch avec `admin`).
 * - Intro « écriture » à chaque chargement de page : le point sort avec le « i »,
 *   décolle sur son élan et retombe sur la fourchette avant que les couverts trinquent.
 * - Au clic (souris) ou au toucher (doigt) : les couverts s'écartent et lancent le point,
 *   qui retombe sur la fourchette avant que les couverts trinquent.
 *
 * props : height (px), color (lettres), accent (point), className
 */
export default function Logotype({ height = 40, color = "currentColor", accent = "#EA580C", className = "", playIntro = true, admin = false }: Props) {
  const clipId = useId();
  const [intro, setIntro] = useState(() => playIntro && shouldPlayIntro());
  const [hop, setHop] = useState(false);

  const shift = admin ? ADMIN_SHIFT : 0;
  const letters = admin
    ? [...ADMIN_LETTERS, ...LETTERS.map((l) => ({ ...l, x: l.x + shift }))]
    : LETTERS;
  // Trois lettres de plus : le point et le trinquage arrivent d'autant plus tard.
  const extra = admin ? ADMIN_LETTERS.length * LETTER_STEP : 0;

  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(false), INTRO_DURATION + extra * 1000);
    return () => clearTimeout(t);
  }, [intro, extra]);

  const playHop = () => {
    if (!intro && !hop) setHop(true);
  };

  const endHop = (e: AnimationEvent<SVGSVGElement>) => {
    if (hop && e.animationName === "infflunch-hop-knife") setHop(false);
  };

  const classes = [
    "infflunch-logo",
    intro && "infflunch-logo--intro",
    hop && "infflunch-logo--hop",
    className,
  ].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      viewBox={admin ? "-6 14 578 72" : "-6 14 384 72"}
      style={admin ? ({ "--il-dot-delay": `${0.2 + extra}s`, "--il-clink-delay": `${0.83 + extra}s` } as CSSProperties) : undefined}
      height={height}
      role="img"
      aria-label={admin ? "adminfflunch" : "infflunch"}
      onPointerDown={playHop}
      onAnimationEnd={endHop}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="-100" y="-100" width="2000" height="180.2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {letters.map((l, i) => (
          <g key={i} className="il-letter" style={{ animationDelay: `${i * LETTER_STEP}s` }}>
            {/* Le point est dans le groupe de la fourchette : il suit tous ses mouvements. */}
            <g className={l.role ? `il-${l.role}` : undefined}>
              {l.d.map((d, j) => (
                <path key={j} transform={`translate(${l.x} 0)`} fill={l.accent ? accent : color} d={d} />
              ))}
              {l.role === "fork" && (
                <g transform={`translate(${l.x} 0)`}>
                  <path className="il-dot" fill={accent} d={P.dot} />
                </g>
              )}
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

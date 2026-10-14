import { useEffect, useId, useState, type AnimationEvent, type CSSProperties } from "react";
import { shouldPlayIntro } from "./introOnce";
import "./Logo.css";

const INTRO_DURATION = 2100; // ms, durée totale de l'intro
const LETTER_STEP = 0.08; // s, écart entre deux lettres à l'intro

const P = {
  fork: "M19.393 40.843 L21.626 39.95 V54 A1.28 1.28 0 0 0 24.186 54 V38.926 L27.814 37.474 V54 A1.28 1.28 0 0 0 30.374 54 V36.45 L32.607 35.557 Q34 35 34 36.5 V73 A7 7 0 0 1 27 80 H25 A7 7 0 0 1 18 73 V42.9 Q18 41.4 19.393 40.843 Z",
  dot: "M19.393 25.843 L32.607 20.557 Q34 20 34 21.5 V28.5 Q34 30 32.607 30.557 L19.393 35.843 Q18 36.4 18 34.9 V27.9 Q18 26.4 19.393 25.843 Z",
  n: "M7 80 A7 7 0 0 1 0 73 V39.5 Q0 38 1.5 38 H26.88 A21.12 21.12 0 0 1 48 59.12 V73 A7 7 0 0 1 41 80 H39 A7 7 0 0 1 32 73 V60 A8 8 0 0 0 16 60 V73 A7 7 0 0 1 9 80 Z",
  f1: "M11 80 A7 7 0 0 1 4 73 V36 A16 16 0 0 1 20 20 H30.5 Q32 20 32 21.5 V32.5 Q32 34 30.5 34 H24 A4 4 0 0 0 20 38 V73 A7 7 0 0 1 13 80 Z",
  f2: "M45 80 A7 7 0 0 1 38 73 V36 A16 16 0 0 1 54 20 H64.5 Q66 20 66 21.5 V32.5 Q66 34 64.5 34 H58 A4 4 0 0 0 54 38 V73 A7 7 0 0 1 47 80 Z",
  ffBar: "M1.5 38 H64.5 Q66 38 66 39.5 V50.5 Q66 52 64.5 52 H1.5 Q0 52 0 50.5 V39.5 Q0 38 1.5 38 Z",
  knife: "M51 80 A7 7 0 0 1 44 73 V21.5 Q44 20.1 45.4 20.4 C52.8 22.5 60 31 60 43 V73 A7 7 0 0 1 53 80 Z",
  u: "M1.5 38 H14.5 Q16 38 16 39.5 V58 A8 8 0 0 0 32 58 V39.5 Q32 38 33.5 38 H46.5 Q48 38 48 39.5 V73 A7 7 0 0 1 41 80 H21.12 A21.12 21.12 0 0 1 0 58.88 V39.5 Q0 38 1.5 38 Z",
  c: "M21 38 H38.5 Q40 38 40 39.5 V50.5 Q40 52 38.5 52 H23 A7 7 0 0 0 23 66 H38.5 Q40 66 40 67.5 V78.5 Q40 80 38.5 80 H21 A21 21 0 0 1 21 38 Z",
  a: "M21 38 H46.5 Q48 38 48 39.5 V73 A7 7 0 0 1 41 80 H21 A21 21 0 0 1 21 38 Z M32 52 H23 A7 7 0 0 0 23 66 H32 Z",
  d: "M21 38 H32 V27.9 Q32 26.4 33.393 25.843 L46.607 20.557 Q48 20 48 21.5 V73 A7 7 0 0 1 41 80 H21 A21 21 0 0 1 21 38 Z M32 52 H23 A7 7 0 0 0 23 66 H32 Z",
  m: "M7 80 A7 7 0 0 1 0 73 V39.5 Q0 38 1.5 38 H58 A22 22 0 0 1 80 60 V73 A7 7 0 0 1 73 80 H71 A7 7 0 0 1 64 73 V60 A8 8 0 0 0 48 60 V73 A7 7 0 0 1 41 80 H39 A7 7 0 0 1 32 73 V60 A8 8 0 0 0 16 60 V73 A7 7 0 0 1 9 80 Z",
  h: "M7 80 A7 7 0 0 1 0 73 V27.9 Q0 26.4 1.393 25.843 L14.607 20.557 Q16 20 16 21.5 V38 H26.88 A21.12 21.12 0 0 1 48 59.12 V73 A7 7 0 0 1 41 80 H39 A7 7 0 0 1 32 73 V60 A8 8 0 0 0 16 60 V73 A7 7 0 0 1 9 80 Z",
};

// Lettres dans l'ordre d'écriture : décalage horizontal, tracés, rôle éventuel.
type Letter = { x: number; d: string[]; role?: "fork" | "knife"; accent?: boolean };

const LETTERS: Letter[] = [
  { x: -18, d: [P.fork], role: "fork" },
  { x: 22, d: [P.n] },
  { x: 76, d: [P.f1, P.f2, P.ffBar] },
  { x: 104, d: [P.knife], role: "knife" },
  { x: 170, d: [P.u] },
  { x: 224, d: [P.n] },
  { x: 278, d: [P.c] },
  { x: 324, d: [P.h] },
];

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

// Préfixe « adm » (orange) de la version admin ; le reste du mot est décalé
// d'ADMIN_SHIFT, comme dans adminfflunch-logotype.svg.
const ADMIN_SHIFT = 194;
const ADMIN_LETTERS: Letter[] = [
  { x: 0, d: [P.a], accent: true },
  { x: 54, d: [P.d], accent: true },
  { x: 108, d: [P.m], accent: true },
];

/**
 * Logotype infflunch (ou adminfflunch avec `admin`).
 * - Intro « écriture » à chaque chargement de page.
 * - Au clic (souris) ou au toucher (doigt) : le point saute et les couverts trinquent.
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
    if (hop && e.animationName === "infflunch-clink-r") setHop(false);
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
      style={admin ? ({ "--il-dot-delay": `${0.91 + extra}s`, "--il-clink-delay": `${1.51 + extra}s` } as CSSProperties) : undefined}
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
            <g className={l.role ? `il-${l.role}` : undefined}>
              {l.d.map((d, j) => (
                <path key={j} transform={`translate(${l.x} 0)`} fill={l.accent ? accent : color} d={d} />
              ))}
            </g>
          </g>
        ))}
      </g>
      <g transform={`translate(${shift - 18} 0)`}>
        <path className="il-dot" fill={accent} d={P.dot} />
      </g>
    </svg>
  );
}

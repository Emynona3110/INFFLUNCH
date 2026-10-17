import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import CandyGrab from "./CandyGrab";
import { reducedMotion } from "./grab";
import useCandies from "./useCandies";
import "./halloween.css";

/*
 * Toile et araignée en haut à droite de la page Déjeuner (animations 05 et
 * 06 livrées). L'araignée tient la papillote, premier bonbon de la chasse :
 * un clic dessus la lui prend. Le bonbon passe au premier plan et grossit,
 * comme ramassé. L'araignée passe aussitôt à la boucle sans bonbon
 * (remontée, chute, rebonds), pendant que son balancier s'amortit jusqu'au
 * milieu ; elle garde cette boucle toute l'année pour qui l'a déjà trouvé.
 *
 * Dessin à la taille d'origine (repère 480 × 600) réduit en CSS (--hl-sc) ;
 * la longueur du fil (--hl-l) est plus courte sur mobile, où la page est
 * étroite.
 */

/** Amortissement du balancier une fois le bonbon pris (ms). */
const SETTLE_MS = 1000;

const WEB_SPOKES =
  "M480 0 L210.0 0.0 M480 0 L223.2 83.4 M480 0 L261.6 158.7 M480 0 L321.3 218.4 M480 0 L396.6 256.8 M480 0 L480.0 270.0";
const WEB_RINGS =
  "M435.0 0.0 Q440.0 6.3 437.2 13.9 Q443.9 18.4 443.6 26.5 Q451.4 28.6 453.5 36.4 Q461.6 36.1 466.1 42.8 Q473.7 40.0 480.0 45.0 M390.0 0.0 Q400.0 12.7 394.4 27.8 Q407.8 36.8 407.2 52.9 Q422.7 57.3 427.1 72.8 Q443.2 72.2 452.2 85.6 Q467.3 80.0 480.0 90.0 M340.0 0.0 Q355.6 19.7 346.9 43.3 Q367.7 57.2 366.7 82.3 Q390.9 89.1 397.7 113.3 Q422.8 112.3 436.7 133.1 Q460.3 124.4 480.0 140.0 M285.0 0.0 Q306.7 27.5 294.5 60.3 Q323.6 79.7 322.2 114.6 Q355.9 124.1 365.4 157.8 Q400.3 156.4 419.7 185.5 Q452.5 173.3 480.0 195.0 M230.0 0.0 Q257.8 35.2 242.2 77.3 Q279.5 102.1 277.7 146.9 Q320.9 159.1 333.1 202.3 Q377.9 200.5 402.7 237.8 Q444.8 222.2 480.0 250.0";

/** Pattes d'un côté, de haut en bas. La dernière tient le bonbon (`hold`),
 *  puis se détend (`free`). */
const LEGS = [
  { origin: "9px -10px", d: "M9 -10 Q22 -24 34 -10" },
  { origin: "13px -4px", d: "M13 -4 Q30 -14 40 2" },
  { origin: "13px 4px", d: "M13 4 Q30 0 38 16" },
  { origin: "9px 10px", d: "M9 10 Q16 20 14 30", free: "M9 10 Q22 14 28 28" },
];
/** Retard de chaque patte (s) : côté gauche (miroir) puis droit. */
const DELAYS = {
  hold: [[0.1, 0.14, 0.18, 0.22], [0.12, 0.16, 0.2, 0.24]],
  free: [[0, 0.03, 0.06, 0.09], [0.02, 0.05, 0.08, 0.11]],
} as const;

type Mode = "hold" | "free";

const Legs = ({ mode }: { mode: Mode }) => {
  const side = (s: 0 | 1) =>
    LEGS.map((leg, i) => {
      const d = mode === "free" ? (leg.free ?? leg.d) : leg.d;
      return (
        <path
          key={i}
          className={mode === "free" ? "hl-sp-leg-free" : "hl-sp-leg-hold"}
          style={{ transformOrigin: leg.origin, animationDelay: `${DELAYS[mode][s][i]}s` }}
          d={d}
        />
      );
    });
  return (
    <g fill="none" stroke="#EA580C" strokeWidth={3.5} strokeLinecap="round">
      <g transform="scale(-1 1)">{side(0)}</g>
      {side(1)}
      <circle r={15} fill="#EA580C" stroke="none" />
    </g>
  );
};

/** Papillote (bonbon n° 3 des modèles), centrée sur l'origine. */
const Papillote = ({ clipId }: { clipId: string }) => (
  <>
    <clipPath id={clipId}>
      <ellipse rx={24} ry={17} />
    </clipPath>
    <path
      fill="#5478D4"
      d="M-16 0 C-24 -5 -32 -14 -40 -16 C-45 -6 -45 6 -40 16 C-32 14 -24 5 -16 0 Z M16 0 C24 -5 32 -14 40 -16 C45 -6 45 6 40 16 C32 14 24 5 16 0 Z"
    />
    <ellipse rx={24} ry={17} fill="#5478D4" />
    <g clipPath={`url(#${clipId})`}>
      <path fill="none" stroke="#FFFFFF" strokeWidth={5} d="M-12 -20 L-2 20 M4 -20 L14 20" />
    </g>
  </>
);


/** Angle du balancier (degrés) à cet instant. */
const angleOf = (el: Element | null) => {
  const t = el ? getComputedStyle(el).transform : "none";
  const m = t === "none" ? new DOMMatrix() : new DOMMatrix(t);
  return (Math.atan2(m.b, m.a) * 180) / Math.PI;
};

const SpiderWeb = () => {
  const { found, loading, find, on } = useCandies();
  const hasCandy = found.includes("papillote");
  // Pris pendant cette visite : la boucle sans bonbon démarre aussitôt.
  const [picked, setPicked] = useState(false);
  // Matrice écran du bonbon au moment du clic : copie au premier plan.
  const [grab, setGrab] = useState<DOMMatrix | null>(null);
  const candyRef = useRef<SVGGElement>(null);
  const swayRef = useRef<SVGGElement>(null);
  const pivotRef = useRef<SVGGElement>(null);
  // Angle du balancier au moment de la prise (null : rien à amortir).
  const fromAngle = useRef<number | null>(null);

  // Hors chasse (après 2026), l'araignée n'a pas de bonbon.
  const mode: Mode = !on || picked || hasCandy ? "free" : "hold";

  // La boucle sans bonbon part droite : un pivot autour d'elle reprend
  // l'angle du balancier et l'amortit comme un pendule qui s'arrête (il
  // passe le milieu, déborde un peu, revient). Avant l'affichage : pas une
  // image où l'araignée saute au milieu.
  useLayoutEffect(() => {
    const angle = fromAngle.current;
    if (!picked || angle === null) return;
    fromAngle.current = null;
    pivotRef.current?.animate(
      [
        { transform: `rotate(${angle}deg)`, easing: "ease-in-out" },
        { transform: `rotate(${-angle * 0.3}deg)`, offset: 0.6, easing: "ease-in-out" },
        { transform: "rotate(0deg)" },
      ],
      { duration: SETTLE_MS }
    );
  }, [picked]);

  const take = () => {
    if (picked) return;
    if (!reducedMotion()) {
      const m = candyRef.current?.getScreenCTM();
      if (m) setGrab(DOMMatrix.fromMatrix(m));
      fromAngle.current = angleOf(swayRef.current);
    }
    setPicked(true);
    find("papillote");
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      take();
    }
  };

  // Affichée par Déjeuner une fois ses données chargées (cf. lunchDecor).
  if (loading) return null;

  return (
    <div className="hl-spider" aria-hidden={mode === "free" || undefined}>
      <svg viewBox="0 0 480 600">
        <g aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth={3.5} d={WEB_SPOKES} />
            <path strokeWidth={2.5} d={WEB_RINGS} />
          </g>
        </g>
        <g transform="translate(397.7 113.3)">
          <circle r={4.5} fill="currentColor" />
          <g ref={pivotRef} className="hl-sp-pivot">
          {/* Remonté au passage à la boucle sans bonbon : chaque animation
              repart de son début. */}
          <g key={mode} ref={swayRef} className={mode === "hold" ? "hl-sp-sway" : undefined}>
            <rect
              className={mode === "hold" ? "hl-sp-thread" : "hl-sp-thread hl-sp-thread-free"}
              x={-1.5}
              y={0}
              width={3}
              height={1}
              fill="currentColor"
            />
            <g className={mode === "hold" ? "hl-sp-drop" : "hl-sp-drop hl-sp-drop-free"}>
              <g transform="translate(0 15)">
                {mode === "hold" && (
                  <g className={picked ? "hl-sp-gone" : undefined}>
                    <g className="hl-sp-candy">
                      <g ref={candyRef} transform="translate(0 24) scale(0.6)">
                        <Papillote clipId="hl-sp-pap" />
                      </g>
                    </g>
                  </g>
                )}
                <Legs mode={mode} />
                {mode === "hold" && !picked && (
                  <circle
                    className="hl-sp-hit"
                    cy={20}
                    r={55}
                    role="button"
                    tabIndex={0}
                    aria-label="Prendre le bonbon de l'araignée"
                    onClick={take}
                    onKeyDown={onKey}
                  />
                )}
              </g>
            </g>
          </g>
          </g>
        </g>
      </svg>
      {grab && (
        // Copie du bonbon, rotation du balancier comprise (matrice écran).
        <CandyGrab m={grab} width={90} onDone={() => setGrab(null)}>
          <svg viewBox="-45 -20 90 40" width={90} height={40} className="block">
            <Papillote clipId="hl-sp-pap-grab" />
          </svg>
        </CandyGrab>
      )}
    </div>
  );
};

export default SpiderWeb;

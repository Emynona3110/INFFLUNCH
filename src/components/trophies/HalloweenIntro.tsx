import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { IntroProps } from "@/lib/trophyAssets";

/*
 * Intro du trophée « Trick or Treat » (animation 02 du paquet : la
 * citrouille-panier tombe, puis douze bonbons s'y entassent), rejouée en
 * CALQUES HTML animés en `transform` : le navigateur les anime sur la carte
 * graphique, sans dépendre du fil principal. Animée à l'intérieur d'un SVG,
 * elle était redessinée image par image et accrochait sur un écran 240 Hz
 * au moindre travail de la page.
 *
 * Calques, de l'arrière vers l'avant : la citrouille entière, les bonbons,
 * puis l'avant du panier (la citrouille rognée sous le bord) qui cache les
 * bonbons tombés dedans — le clipPath de l'original.
 *
 * Repère d'origine 480 × 520, cadré 60 −20 360 470 (même cadrage que l'image
 * du trophée et que son saut). Distances en `cqh` (hauteur de la scène).
 * Chargé à la demande (fiche du trophée) : rien dans le code des pages.
 */

const VB = { x: 60, y: -20, w: 360, h: 470 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
/** Unités du repère → hauteur de la scène (cqh). */
const cqh = (u: number) => `${(u / VB.h) * 100}cqh`;

const FORK =
  "M19.393 27.443 L36.607 20.557 Q38 20 38 21.5 V28.5 Q38 30 36.607 30.557 L19.393 37.443 Q18 38 18 36.5 V29.5 Q18 28 19.393 27.443 Z M19.393 42.443 L22.533 41.187 V54 A1.6 1.6 0 0 0 25.733 54 V39.907 L30.267 38.093 V54 A1.6 1.6 0 0 0 33.467 54 V36.813 L36.607 35.557 Q38 35 38 36.5 V73 A7 7 0 0 1 31 80 H25 A7 7 0 0 1 18 73 V44.5 Q18 43 19.393 42.443 Z";
const KNIFE = "M51 80 A7 7 0 0 1 44 73 V21.5 Q44 20.1 45.4 20.4 C55 22.5 64 31 64 43 V73 A7 7 0 0 1 57 80 Z";
/** Sous le bord du panier, hors de son ouverture : l'avant qui cache les
 *  bonbons (complément du clipPath de l'original). */
const FRONT_CLIP = "M-600 190 L128 190 A112 24 0 0 0 352 190 L1080 190 L1080 1200 L-600 1200 Z";

const Pumpkin = ({ dark, front }: { dark: boolean; front?: boolean }) => (
  <svg viewBox={VIEWBOX} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
    {front && (
      <clipPath id="ti-front">
        <path d={FRONT_CLIP} />
      </clipPath>
    )}
    <g clipPath={front ? "url(#ti-front)" : undefined}>
      <path fill="none" stroke={dark ? "#5478D4" : "#113894"} strokeWidth={10} strokeLinecap="round" d="M128 190 C120 40 360 40 352 190" />
      <ellipse cx={165} cy={310} rx={95} ry={125} fill="#EA580C" />
      <ellipse cx={315} cy={310} rx={95} ry={125} fill="#EA580C" />
      <ellipse cx={240} cy={305} rx={105} ry={135} fill="#EA580C" />
      <ellipse cx={240} cy={190} rx={124} ry={30} fill="#EA580C" />
      <path fill="#113894" d="M150 348 C190 378 290 378 330 348 C320 398 280 418 240 418 C200 418 160 398 150 348 Z" />
      <path fill="#113894" transform="translate(180 333) scale(1.75) translate(-28 -80)" d={FORK} />
      <path fill="#113894" transform="translate(300 333) scale(1.75) translate(-54 -80)" d={KNIFE} />
      <path fill="#EA580C" d="M204 360 L222 364 L220 380 L206 377 Z M258 364 L276 360 L274 377 L260 380 Z M230 418 L230 402 L250 402 L250 418 Z" />
      <ellipse cx={240} cy={190} rx={112} ry={24} fill="#113894" />
    </g>
  </svg>
);

type Kind = "menthe" | "papillote" | "mais" | "sucette";

const CandyShape = ({ kind, id, dark }: { kind: Kind; id: string; dark: boolean }) => {
  switch (kind) {
    case "menthe":
      return (
        <>
          <path fill="#EA580C" d="M0 0 L22 0 A22 22 0 0 1 19.05 11 Z M0 0 L11 19.05 A22 22 0 0 1 0 22 Z M0 0 L-11 19.05 A22 22 0 0 1 -19.05 11 Z M0 0 L-22 0 A22 22 0 0 1 -19.05 -11 Z M0 0 L-11 -19.05 A22 22 0 0 1 0 -22 Z M0 0 L11 -19.05 A22 22 0 0 1 19.05 -11 Z" />
          <path fill="#FFFFFF" d="M0 0 L19.05 11 A22 22 0 0 1 11 19.05 Z M0 0 L0 22 A22 22 0 0 1 -11 19.05 Z M0 0 L-19.05 11 A22 22 0 0 1 -22 0 Z M0 0 L-19.05 -11 A22 22 0 0 1 -11 -19.05 Z M0 0 L0 -22 A22 22 0 0 1 11 -19.05 Z M0 0 L19.05 -11 A22 22 0 0 1 22 0 Z" />
          <circle r={22} fill="none" stroke="#5478D4" strokeWidth={3} />
          <circle r={4} fill="#FFFFFF" />
        </>
      );
    case "papillote":
      return (
        <>
          <clipPath id={id}>
            <ellipse rx={24} ry={17} />
          </clipPath>
          <path fill="#5478D4" d="M-16 0 C-24 -5 -32 -14 -40 -16 C-45 -6 -45 6 -40 16 C-32 14 -24 5 -16 0 Z M16 0 C24 -5 32 -14 40 -16 C45 -6 45 6 40 16 C32 14 24 5 16 0 Z" />
          <ellipse rx={24} ry={17} fill="#5478D4" />
          <g clipPath={`url(#${id})`}>
            <path fill="none" stroke="#FFFFFF" strokeWidth={5} d="M-12 -20 L-2 20 M4 -20 L14 20" />
          </g>
        </>
      );
    case "mais": {
      const corn = "M0 -34 C6 -34 28 12 28 18 C28 25 18 26 0 26 C-18 26 -28 25 -28 18 C-28 12 -6 -34 0 -34 Z";
      return (
        <>
          <clipPath id={id}>
            <path d={corn} />
          </clipPath>
          <g clipPath={`url(#${id})`}>
            <rect x={-30} y={-36} width={60} height={22} fill="#FFFFFF" />
            <rect x={-30} y={-14} width={60} height={20} fill="#EA580C" />
            <rect x={-30} y={6} width={60} height={22} fill="#5478D4" />
          </g>
          <path fill="none" stroke="#5478D4" strokeWidth={2.5} strokeLinejoin="round" d={corn} />
        </>
      );
    }
    case "sucette":
      return (
        <>
          <path fill="none" stroke={dark ? "#FFFFFF" : "#5478D4"} strokeWidth={6} strokeLinecap="round" d="M0 10 L0 64" />
          <circle r={24} fill="#EA580C" />
          <path fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" d="M-3 0 a3 3 0 1 1 6 0 a6.5 6.5 0 1 1 -13 0 a10 10 0 1 1 20 0 a13.5 13.5 0 1 1 -27 0 a17 17 0 1 1 34 0" />
        </>
      );
  }
};

/** Les douze bonbons de l'original, dans son ordre (le dernier devant) :
 *  position, angle posé, départ (s), angle de départ (deg). */
const CANDIES: { kind: Kind; x: number; y: number; rot: number; delay: number; from: number }[] = [
  { kind: "menthe", x: 172, y: 212, rot: 10, delay: 0.35, from: 200 },
  { kind: "papillote", x: 300, y: 214, rot: -12, delay: 0.4, from: -160 },
  { kind: "mais", x: 232, y: 214, rot: 0, delay: 0.45, from: 240 },
  { kind: "papillote", x: 196, y: 204, rot: 20, delay: 0.5, from: -200 },
  { kind: "menthe", x: 276, y: 206, rot: -10, delay: 0.55, from: 180 },
  { kind: "mais", x: 318, y: 196, rot: -18, delay: 0.6, from: -220 },
  { kind: "sucette", x: 214, y: 168, rot: -12, delay: 0.65, from: 150 },
  { kind: "menthe", x: 168, y: 192, rot: 25, delay: 0.7, from: -190 },
  { kind: "papillote", x: 262, y: 188, rot: 8, delay: 0.75, from: 210 },
  { kind: "mais", x: 200, y: 188, rot: 24, delay: 0.85, from: -170 },
  { kind: "sucette", x: 296, y: 158, rot: 14, delay: 0.8, from: 230 },
  { kind: "sucette", x: 244, y: 152, rot: -6, delay: 0.9, from: -150 },
];

/** Boîte d'un bonbon (repère −46…46 autour de son point). */
const BOX = 92;

const CSS = `
.ti-stage { container-type: size; }
.ti-layer { position: absolute; inset: 0; will-change: transform; }
.ti-pk { transform-origin: 50% ${((440 - VB.y) / VB.h) * 100}%; animation: ti-pk 0.55s both; }
.ti-candy { position: absolute; will-change: transform; animation: ti-drop 0.6s both; }
.ti-paused .ti-pk, .ti-paused .ti-candy { animation-play-state: paused; }
@keyframes ti-pk {
  0% { transform: translateY(${cqh(-560)}) scale(1, 1); animation-timing-function: cubic-bezier(.55, 0, 1, .45); }
  60% { transform: translateY(0) scale(1, 1); animation-timing-function: ease-out; }
  74% { transform: translateY(0) scale(1.08, .9); animation-timing-function: ease-in-out; }
  88% { transform: translateY(0) scale(.98, 1.03); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes ti-drop {
  0% { transform: translateY(${cqh(-460)}) rotate(var(--ti-from)); animation-timing-function: cubic-bezier(.55, 0, 1, .45); }
  70% { transform: translateY(0) rotate(0deg); animation-timing-function: ease-out; }
  85% { transform: translateY(${cqh(-8)}) rotate(0deg); animation-timing-function: ease-in; }
  100% { transform: translateY(0) rotate(0deg); }
}
@media (prefers-reduced-motion: reduce) {
  .ti-pk, .ti-candy { animation: none; }
}
`;

/** Durée de l'intro (dernier bonbon : départ 0,9 s + chute 0,6 s). */
const INTRO_MS = 1500;

/**
 * `onDone` : intro finie (figée sur sa dernière image, le repos du trophée).
 * Elle attend, figée sur sa première image, que la popup soit vraiment à
 * l'écran (deux images dessinées) : ses premières images ne se perdent pas
 * pendant l'ouverture.
 */
const HalloweenIntro = ({ dark, onDone }: IntroProps) => {
  const [started, setStarted] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStarted(true);
      done.current();
      return;
    }
    let timer: number | undefined;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        setStarted(true);
        timer = window.setTimeout(() => done.current(), INTRO_MS);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, []);

  return (
  <div className={`ti-stage absolute inset-0${started ? "" : " ti-paused"}`}>
    <style>{CSS}</style>
    <div className="ti-layer ti-pk">
      <Pumpkin dark={dark} />
    </div>
    {CANDIES.map((c, i) => (
      <div
        key={i}
        className="ti-candy"
        style={
          {
            left: `${((c.x - BOX / 2 - VB.x) / VB.w) * 100}%`,
            top: `${((c.y - BOX / 2 - VB.y) / VB.h) * 100}%`,
            width: `${(BOX / VB.w) * 100}%`,
            height: `${(BOX / VB.h) * 100}%`,
            animationDelay: `${c.delay}s`,
            "--ti-from": `${c.from}deg`,
          } as CSSProperties
        }
      >
        <svg viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`} className="block h-full w-full overflow-visible" aria-hidden>
          <g transform={`rotate(${c.rot}) scale(0.85)`}>
            <CandyShape kind={c.kind} id={`ti-c${i}`} dark={dark} />
          </g>
        </svg>
      </div>
    ))}
    {/* Avant du panier : mêmes mouvements que la citrouille, par-dessus
        les bonbons, qu'il cache une fois tombés dedans. */}
    <div className="ti-layer ti-pk">
      <Pumpkin dark={dark} front />
    </div>
  </div>
  );
};

export default HalloweenIntro;

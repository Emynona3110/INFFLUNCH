import type { CSSProperties } from "react";
import type { CandyId } from "./useCandies";

/*
 * Les quatre bonbons de la chasse, droits et centrés dans un carré (modèles
 * du paquet 01) : pour les présenter (annonce de la quête, encart du
 * profil). Les cachettes ont chacune leur propre dessin (penché, à la taille
 * de ce qu'il remplace).
 */

const MINT_ORANGE =
  "M0 0 L22 0 A22 22 0 0 1 19.05 11 Z M0 0 L11 19.05 A22 22 0 0 1 0 22 Z M0 0 L-11 19.05 A22 22 0 0 1 -19.05 11 Z M0 0 L-22 0 A22 22 0 0 1 -19.05 -11 Z M0 0 L-11 -19.05 A22 22 0 0 1 0 -22 Z M0 0 L11 -19.05 A22 22 0 0 1 19.05 -11 Z";
const MINT_WHITE =
  "M0 0 L19.05 11 A22 22 0 0 1 11 19.05 Z M0 0 L0 22 A22 22 0 0 1 -11 19.05 Z M0 0 L-19.05 11 A22 22 0 0 1 -22 0 Z M0 0 L-19.05 -11 A22 22 0 0 1 -11 -19.05 Z M0 0 L0 -22 A22 22 0 0 1 11 -19.05 Z M0 0 L19.05 -11 A22 22 0 0 1 22 0 Z";
const CORN =
  "M0 -34 C6 -34 28 12 28 18 C28 25 18 26 0 26 C-18 26 -28 25 -28 18 C-28 12 -6 -34 0 -34 Z";
const SPIRAL =
  "M-3 0 a3 3 0 1 1 6 0 a6.5 6.5 0 1 1 -13 0 a10 10 0 1 1 20 0 a13.5 13.5 0 1 1 -27 0 a17 17 0 1 1 34 0";
const WRAPPER_ENDS =
  "M-16 0 C-24 -5 -32 -14 -40 -16 C-45 -6 -45 6 -40 16 C-32 14 -24 5 -16 0 Z M16 0 C24 -5 32 -14 40 -16 C45 -6 45 6 40 16 C32 14 24 5 16 0 Z";

const Shape = ({ candy, clipId }: { candy: CandyId; clipId: string }) => {
  switch (candy) {
    case "papillote":
      return (
        <>
          <clipPath id={clipId}>
            <ellipse rx={24} ry={17} />
          </clipPath>
          <path fill="#5478D4" d={WRAPPER_ENDS} />
          <ellipse rx={24} ry={17} fill="#5478D4" />
          <g clipPath={`url(#${clipId})`}>
            <path fill="none" stroke="#FFFFFF" strokeWidth={5} d="M-12 -20 L-2 20 M4 -20 L14 20" />
          </g>
        </>
      );
    case "sucette":
      return (
        <g transform="translate(0 -20) scale(0.75)">
          <path className="hl-lolli-stick" fill="none" strokeWidth={6} strokeLinecap="round" d="M0 10 L0 64" />
          <circle r={24} fill="#EA580C" />
          <path fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" d={SPIRAL} />
        </g>
      );
    case "menthe":
      return (
        <>
          <path fill="#EA580C" d={MINT_ORANGE} />
          <path fill="#FFFFFF" d={MINT_WHITE} />
          <circle r={22} fill="none" stroke="#5478D4" strokeWidth={3} />
          <circle r={4} fill="#FFFFFF" />
        </>
      );
    case "mais":
      return (
        <g transform="translate(0 4) scale(0.85)">
          <clipPath id={clipId}>
            <path d={CORN} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <rect x={-30} y={-36} width={60} height={22} fill="#FFFFFF" />
            <rect x={-30} y={-14} width={60} height={20} fill="#EA580C" />
            <rect x={-30} y={6} width={60} height={22} fill="#5478D4" />
          </g>
          <path fill="none" stroke="#5478D4" strokeWidth={2.5} strokeLinejoin="round" d={CORN} />
        </g>
      );
  }
};

/** Un bonbon dans un carré (viewBox −46…46). `clipId` : unique dans la page. */
const CandyArt = ({
  candy,
  clipId,
  className,
  style,
}: {
  candy: CandyId;
  clipId: string;
  className?: string;
  style?: CSSProperties;
}) => (
  <svg viewBox="-46 -46 92 92" className={className} style={style} aria-hidden>
    <Shape candy={candy} clipId={clipId} />
  </svg>
);

export default CandyArt;

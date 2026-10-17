import type { ReactNode } from "react";
import CandySpot from "./CandySpot";

/*
 * Sucette (bonbon n° 1 des modèles) à la place de la loupe de la recherche du
 * classement, penchée pour que son bâton fasse le manche. Un clic la prend
 * sans lancer ni ouvrir la recherche ; la vraie loupe reprend sa place.
 */

/** Dessin penché à −45° (bâton vers le bas à droite, comme le manche d'une
 *  loupe) ; viewBox carré qui l'englobe. */
const Art = () => (
  <svg viewBox="-27 -27 77 77" className="block h-full w-full">
    <g transform="rotate(-45)">
      <path
        className="hl-lolli-stick"
        fill="none"
        strokeWidth={6}
        strokeLinecap="round"
        d="M0 10 L0 64"
      />
      <circle r={24} fill="#EA580C" />
      <path
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3.5}
        strokeLinecap="round"
        d="M-3 0 a3 3 0 1 1 6 0 a6.5 6.5 0 1 1 -13 0 a10 10 0 1 1 20 0 a13.5 13.5 0 1 1 -27 0 a17 17 0 1 1 34 0"
      />
    </g>
  </svg>
);

const SearchLollipop = ({
  fallback,
  className,
}: {
  /** La loupe habituelle. */
  fallback: ReactNode;
  /** Taille de la loupe (h-4 w-4…), reprise par la sucette. */
  className?: string;
}) => (
  <CandySpot candy="sucette" art={() => <Art />} fallback={fallback} className={className} />
);

export default SearchLollipop;

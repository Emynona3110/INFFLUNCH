import type { ReactNode } from "react";
import CandySpot from "./CandySpot";

/*
 * Bonbon maïs (bonbon n° 4 des modèles) à la place du repère d'INFFLUX sur la
 * carte des restaurants, posé sur le point comme la goutte (pointe en haut,
 * base sur la position). Un clic le prend ; la goutte orange reprend sa place.
 */

const CORN =
  "M0 -34 C6 -34 28 12 28 18 C28 25 18 26 0 26 C-18 26 -28 25 -28 18 C-28 12 -6 -34 0 -34 Z";

const Art = ({ clipId }: { clipId: string }) => (
  <svg viewBox="-30 -37 60 66" className="block h-full w-full overflow-visible">
    <clipPath id={clipId}>
      <path d={CORN} />
    </clipPath>
    <g clipPath={`url(#${clipId})`}>
      <rect x={-30} y={-36} width={60} height={22} fill="#FFFFFF" />
      <rect x={-30} y={-14} width={60} height={20} fill="#EA580C" />
      <rect x={-30} y={6} width={60} height={22} fill="#5478D4" />
    </g>
    <path fill="none" stroke="#5478D4" strokeWidth={2.5} strokeLinejoin="round" d={CORN} />
  </svg>
);

const MapCandyCorn = ({ fallback }: { fallback: ReactNode }) => (
  <CandySpot
    candy="mais"
    art={(clipId) => <Art clipId={clipId} />}
    fallback={fallback}
    className="hl-corn"
  />
);

export default MapCandyCorn;

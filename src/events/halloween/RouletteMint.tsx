import type { ReactNode } from "react";
import CandySpot from "./CandySpot";

/*
 * Bonbon menthe (bonbon n° 2 des modèles) à la place des dés de l'écran
 * d'attente de la roulette (Restaurants › Roulette). Il tourne lentement,
 * comme une petite roue. Un clic le prend ; les dés reprennent leur place.
 */

const Art = () => (
  <svg viewBox="-26 -26 52 52" className="hl-mint block h-full w-full">
    <path
      fill="#EA580C"
      d="M0 0 L22 0 A22 22 0 0 1 19.05 11 Z M0 0 L11 19.05 A22 22 0 0 1 0 22 Z M0 0 L-11 19.05 A22 22 0 0 1 -19.05 11 Z M0 0 L-22 0 A22 22 0 0 1 -19.05 -11 Z M0 0 L-11 -19.05 A22 22 0 0 1 0 -22 Z M0 0 L11 -19.05 A22 22 0 0 1 19.05 -11 Z"
    />
    <path
      fill="#FFFFFF"
      d="M0 0 L19.05 11 A22 22 0 0 1 11 19.05 Z M0 0 L0 22 A22 22 0 0 1 -11 19.05 Z M0 0 L-19.05 11 A22 22 0 0 1 -22 0 Z M0 0 L-19.05 -11 A22 22 0 0 1 -11 -19.05 Z M0 0 L0 -22 A22 22 0 0 1 11 -19.05 Z M0 0 L19.05 -11 A22 22 0 0 1 22 0 Z"
    />
    <circle r={22} fill="none" stroke="#5478D4" strokeWidth={3} />
    <circle r={4} fill="#FFFFFF" />
  </svg>
);

const RouletteMint = ({
  fallback,
  className,
}: {
  /** Les dés habituels. */
  fallback: ReactNode;
  /** Taille des dés (h-10 w-10…), reprise par la menthe. */
  className?: string;
}) => (
  <CandySpot candy="menthe" art={() => <Art />} fallback={fallback} className={className} />
);

export default RouletteMint;

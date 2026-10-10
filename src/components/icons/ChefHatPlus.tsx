import { SVGProps, useId } from "react";

/** Encoche ronde autour du « + » (rayon, centre), en unités du cadre de 27. */
const NOTCH_R = 6;
const PLUS_C = 20.5;
// Rectangle du cadre évidé du cercle (règle evenodd) : la toque n'est dessinée
// qu'en dehors de l'encoche.
const CLIP = `M0 0H27V27H0Z M${PLUS_C - NOTCH_R} ${PLUS_C}a${NOTCH_R} ${NOTCH_R} 0 1 0 ${2 * NOTCH_R} 0a${NOTCH_R} ${NOTCH_R} 0 1 0 ${-2 * NOTCH_R} 0Z`;

/**
 * Toque (tracé Lucide `ChefHat`) + « + » en bas à droite : « ajouter un
 * resto ». La toque est découpée par une encoche ronde autour du « + » : un
 * `clipPath` (découpe nette) plutôt qu'une pastille peinte — l'encoche laisse
 * voir le fond, quel qu'il soit (survol, thème sombre) — ou qu'un `mask`, dont
 * le bord laissait un anneau semi-transparent.
 */
const ChefHatPlus = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  const clip = useId();
  return (
    <svg
      viewBox="0 0 27 27"
      fill="none"
      stroke="currentColor"
      // Trait épaissi : le cadre de 27 (au lieu de 24) le réduirait à l'écran.
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      <defs>
        <clipPath id={clip}>
          <path clipRule="evenodd" d={CLIP} />
        </clipPath>
      </defs>
      {/* Recentrage mesuré au rendu : l'encre débordait de 0,17 à droite et de
          0,27 en bas (cadre de 27). */}
      <g transform="translate(-0.17 -0.27)">
        <g clipPath={`url(#${clip})`}>
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
          <line x1="6" x2="18" y1="17" y2="17" />
        </g>
        <path d={`M${PLUS_C} ${PLUS_C - 4}v8M${PLUS_C - 4} ${PLUS_C}h8`} />
      </g>
    </svg>
  );
};

export default ChefHatPlus;

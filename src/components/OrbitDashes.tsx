import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Couleur (`text-*`) et opacité du contour. */
  className?: string;
  /** Rayon des coins de l'encart, en px (défaut : `rounded-card`). */
  cardRadius?: number;
}

/** Épaisseur du trait, en px. Le tracé est inséré de la moitié : un trait est
 *  centré sur son chemin, et le svg rogne ce qui dépasse de sa boîte — les
 *  tirets seraient rabotés côté extérieur. */
const STROKE = 2;

/** Rayon de `rounded-card`, cf. --radius-card dans tailwind.css. */
const CARD_RADIUS = 16;

/** Tiret et espace voulus, en px. Les deux sont étirés dans la même proportion
 *  pour tomber juste sur le tour (voir plus bas), de moins d'un demi-pixel. */
const DASH = 7;
const GAP = 5;

/** Vitesse de défilement, en px/s. Assez lente pour qu'on la remarque sans
 *  qu'elle appelle l'œil en continu. */
const SPEED = 7;

/**
 * Contour en tirets qui tournent lentement, pour un encart qui attend une
 * action. Le parent doit être `relative`.
 *
 * Tracé SVG et non bordure CSS : une bordure en tirets ne se déplace pas, et
 * quatre dégradés de fond (l'autre technique courante) s'arrêtent net dans les
 * coins arrondis. Ici les tirets suivent tout le contour, angles compris.
 *
 * ⚠️ Le motif est MESURÉ, pas fixé : posé tel quel sur un contour qui n'en est
 * pas un multiple exact, il laisse à l'endroit où le tracé se referme un tiret
 * tronqué ou deux tirets collés — un défaut immobile, et donc très visible. On
 * mesure le contour et on étire le motif au centième près pour qu'un nombre
 * ENTIER de tirets en fasse le tour. L'animation décale ensuite d'exactement
 * un motif : sa boucle non plus ne se voit pas.
 *
 * ⚠️ N'occupe aucune place — position absolue, et le tracé est inséré de la
 * moitié de son épaisseur pour tenir dans la boîte plutôt que de la déborder.
 * L'encart qui l'accueille garde donc sa bordure, rendue transparente : sans
 * elle, il perdrait 2 px de hauteur en adoptant ce contour.
 */
const OrbitDashes = ({ className, cardRadius = CARD_RADIUS }: Props) => {
  const rectRef = useRef<SVGRectElement>(null);
  const [period, setPeriod] = useState<number | null>(null);

  useEffect(() => {
    const rect = rectRef.current;
    const svg = rect?.ownerSVGElement;
    if (!rect || !svg) return;

    const measure = () => {
      // getTotalLength suit les coins arrondis, contrairement à un périmètre
      // calculé à la main.
      const length = rect.getTotalLength();
      if (!length) return; // pas encore disposé : l'observateur rappellera
      const count = Math.max(8, Math.round(length / (DASH + GAP)));
      setPeriod(length / count);
    };

    measure();
    // La taille de l'encart change avec la fenêtre, le texte, les boutons.
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      aria-hidden
      className={cn(
        "orbit-dashes pointer-events-none absolute inset-0 h-full w-full text-primary/70",
        className
      )}
      style={
        {
          "--orbit-width": `${STROKE}px`,
          ...(period && {
            // Tiret et espace gardent leur proportion, seule l'échelle bouge.
            "--orbit-dash": `${(period * DASH) / (DASH + GAP)}px`,
            "--orbit-gap": `${(period * GAP) / (DASH + GAP)}px`,
            // Un motif par cycle : la vitesse ne dépend donc pas de la taille
            // de l'encart.
            "--orbit-period": `${period}px`,
            "--orbit-dur": `${period / SPEED}s`,
          }),
        } as React.CSSProperties
      }
    >
      {/* width/height en CSS plutôt qu'en attributs : `calc()` n'est pas permis
          dans un attribut de géométrie SVG. */}
      <rect
        ref={rectRef}
        x={STROKE / 2}
        y={STROKE / 2}
        rx={cardRadius - STROKE / 2}
        ry={cardRadius - STROKE / 2}
        style={{
          width: `calc(100% - ${STROKE}px)`,
          height: `calc(100% - ${STROKE}px)`,
        }}
      />
    </svg>
  );
};

export default OrbitDashes;

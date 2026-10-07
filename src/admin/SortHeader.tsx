import { useState } from "react";
import { FiChevronUp } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { SortDir } from "./tableSort";

/**
 * Titre de colonne cliquable. Le chevron est posé HORS DU FLUX, juste après le
 * libellé : il apparaît et change de sens sans jamais décaler le titre (une
 * table qui bouge à chaque clic est illisible). Un chevron fantôme au survol
 * signale les colonnes triables.
 *
 * Un seul chevron, retourné (rotation) pour le décroissant : le changement de
 * sens s'anime au lieu de sauter. Quand le tri part sur une autre colonne, le
 * chevron s'efface en GARDANT son sens ; il ne revient à « croissant » (ce
 * qu'un clic donnerait, montré par le fantôme au survol) qu'une fois invisible.
 */
export function SortHeader({
  label,
  dir,
  onClick,
  hideLabel = false,
}: {
  label: string;
  /** Colonne sans intitulé visible (ex. pastille de nature) : seule la
   *  flèche, à la place du libellé, reste cliquable. Libellé lu par l'aria. */
  hideLabel?: boolean;
  /** Sens actuel sur CETTE colonne, ou null si le tri porte ailleurs. */
  dir: SortDir | null;
  onClick: () => void;
}) {
  // Sens affiché : le dernier sens actif, conservé pendant le fondu de sortie.
  const [shown, setShown] = useState<SortDir>(dir ?? "asc");
  if (dir && dir !== shown) setShown(dir);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Trier par ${label}`}
      className="group relative inline-flex cursor-pointer items-center uppercase tracking-wide transition hover:text-foreground/80"
    >
      {!hideLabel && label}
      <span
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && !dir) setShown("asc");
        }}
        className={cn(
          "pointer-events-none flex items-center transition-[opacity,transform] duration-200 ease-out",
          hideLabel ? "h-4 min-w-4 justify-center" : "absolute left-full ml-0.5",
          shown === "desc" && "rotate-180",
          dir ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}
      >
        <FiChevronUp className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

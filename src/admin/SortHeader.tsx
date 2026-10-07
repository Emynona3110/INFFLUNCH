import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { SortDir } from "./tableSort";

/**
 * Titre de colonne cliquable. Le chevron est posé HORS DU FLUX, juste après le
 * libellé : il apparaît et change de sens sans jamais décaler le titre (une
 * table qui bouge à chaque clic est illisible). Un chevron fantôme au survol
 * signale les colonnes triables.
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Trier par ${label}`}
      className="group relative inline-flex cursor-pointer items-center uppercase tracking-wide transition hover:text-foreground/80"
    >
      {!hideLabel && label}
      <span
        className={cn(
          "pointer-events-none flex items-center transition",
          hideLabel ? "h-4 min-w-4 justify-center" : "absolute left-full ml-0.5",
          dir ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}
      >
        {dir === "desc" ? (
          <FiChevronDown className="h-3.5 w-3.5" />
        ) : (
          <FiChevronUp className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}

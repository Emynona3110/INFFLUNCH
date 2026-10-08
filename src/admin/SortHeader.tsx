import { ReactNode, useState } from "react";
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
 * chevron s'efface en GARDANT son sens ; il ne revient au sens qu'un clic
 * donnerait (`idleDir`, montré par le fantôme au survol) qu'une fois invisible.
 */
export function SortHeader({
  label,
  dir,
  onClick,
  hideLabel = false,
  icon,
  idleDir = "asc",
  disabled = false,
}: {
  label: string;
  /** Colonne sans intitulé visible (ex. pastille de nature) : seule la
   *  flèche, à la place du libellé, reste cliquable. Libellé lu par l'aria. */
  hideLabel?: boolean;
  /** Symbole remplaçant le libellé sur mobile (le libellé reste lu par
   *  l'aria) : des colonnes plus étroites sur un téléphone. */
  icon?: ReactNode;
  /** Colonne qu'il n'y a pas lieu de trier (que des 0 au classement) :
   *  intitulé grisé, ni clic ni chevron fantôme. */
  disabled?: boolean;
  /** Sens actuel sur CETTE colonne, ou null si le tri porte ailleurs. */
  dir: SortDir | null;
  /** Sens qu'un clic appliquerait à cette colonne inactive (premier sens du
   *  tri) : c'est lui que montre le chevron fantôme au survol. */
  idleDir?: SortDir;
  onClick: () => void;
}) {
  // Sens affiché : le dernier sens actif, conservé pendant le fondu de sortie.
  const [shown, setShown] = useState<SortDir>(dir ?? idleDir);
  if (dir && dir !== shown) setShown(dir);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Trier par ${label}`}
      className={cn(
        "group relative items-center uppercase tracking-wide transition",
        // Sans intitulé, un bouton en ligne se pose sur la ligne de base du
        // texte : l'interligne réservé dessous grandissait toute la ligne
        // d'en-tête (Demandes, colonne Nature). En bloc centré, il n'a que
        // sa propre hauteur.
        hideLabel ? "mx-auto flex" : "inline-flex",
        disabled
          ? "cursor-default opacity-40"
          : "cursor-pointer hover:text-foreground/80",
      )}
    >
      {!hideLabel &&
        (icon ? (
          <>
            <span className="flex items-center sm:hidden">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        ))}
      <span
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && !dir) setShown(idleDir);
        }}
        className={cn(
          "pointer-events-none flex items-center transition-[opacity,transform] duration-200 ease-out",
          hideLabel ? "h-4 min-w-4 justify-center" : "absolute left-full ml-0.5",
          shown === "desc" && "rotate-180",
          dir
            ? "opacity-100"
            : disabled
              ? "opacity-0"
              : "opacity-0 group-hover:opacity-40"
        )}
      >
        <FiChevronUp className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

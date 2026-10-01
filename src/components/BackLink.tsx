import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface Props {
  /** Où aller quand il n'y a pas d'écran précédent, et comment l'annoncer. */
  fallbackTo: string;
  fallbackLabel: string;
  className?: string;
}

/**
 * Flèche de retour des pages où l'on entre depuis n'importe où (fiche
 * restaurant, profil d'un collègue) : on y arrive d'une tablée du midi, d'un
 * avis, d'une photo, de la grille… Renvoyer toujours au même endroit faisait
 * perdre le fil à qui venait d'ailleurs.
 *
 * `location.key === "default"` est la marque d'une PREMIÈRE entrée dans
 * l'historique — lien partagé, favori, F5. Là, revenir en arrière ferait
 * quitter le site : on propose alors l'écran de rattachement de la page (même
 * raisonnement que le « Retour » des pages légales).
 */
const BackLink = ({ fallbackTo, fallbackLabel, className }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== "default";

  return (
    <button
      type="button"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallbackTo))}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary",
        className
      )}
    >
      <FiArrowLeft className="h-4 w-4" />
      {canGoBack ? "Retour" : fallbackLabel}
    </button>
  );
};

export default BackLink;

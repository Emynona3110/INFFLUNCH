import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const linkCls =
  "text-inherit no-underline visited:text-inherit hover:text-foreground hover:underline";

/**
 * Pied de page présent sur TOUS les écrans (mentions légales obligatoires dès
 * la page de connexion). `compact` = sans marge au-dessus, pour les écrans
 * pleine hauteur (carte, roue, admin, Mon compte mobile) où il est déjà calé
 * en bas — même rendu sinon.
 */
export const Footer = ({ compact = false }: { compact?: boolean }) => {
  // Depuis une page légale, l'autre s'ouvre en `replace` : les deux pages ne
  // s'empilent pas dans l'historique, « Retour » ramène à l'écran d'origine.
  const onLegal = /^\/(mentions-legales|confidentialite)$/.test(
    useLocation().pathname,
  );
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-center gap-x-2 text-center text-[11px] text-foreground/45",
        // Même filet et même hauteur partout ; `compact` retire seulement la
        // marge au-dessus (le footer est déjà calé en bas de l'écran).
        "border-t border-border py-2 sm:py-3",
        !compact && "mt-4 sm:mt-8",
      )}
    >
      <span>Infflunch 2026</span>
      <span aria-hidden="true">·</span>
      <Link to="/mentions-legales" replace={onLegal} className={linkCls}>
        Mentions légales
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/confidentialite" replace={onLegal} className={linkCls}>
        Confidentialité
      </Link>
    </footer>
  );
};

export default Footer;

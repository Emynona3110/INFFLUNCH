import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const linkCls =
  "text-inherit no-underline visited:text-inherit hover:text-foreground hover:underline";

/**
 * Pied de page présent sur TOUS les écrans (mentions légales obligatoires dès
 * la page de connexion). `compact` = variante d'une ligne, sans marge, pour les
 * écrans pleine hauteur (carte, roue, admin, Mon compte mobile).
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
        compact
          ? "border-t border-border/60 py-1"
          : "mt-4 border-t border-border py-2 sm:mt-8 sm:py-3",
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

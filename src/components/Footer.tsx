import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import useSession from "@/hooks/useSession";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  screenLoaderBusy,
  subscribeScreenLoader,
} from "@/components/brand/screenLoaderControl";
import { eventTheme } from "@/events";

// Soulignés en permanence : en gris clair, c'est ce qui les distingue de la
// mention « Infflunch 2026 », qui n'est pas cliquable.
const linkCls =
  "text-inherit underline underline-offset-2 decoration-foreground/25 transition-colors duration-200 visited:text-inherit hover:text-foreground hover:decoration-foreground/60";

/**
 * Pied de page présent sur TOUS les écrans (mentions légales obligatoires dès
 * la page de connexion). `compact` = sans marge au-dessus, pour les écrans
 * pleine hauteur (carte, roue, admin, Mon compte mobile) où il est déjà calé
 * en bas — même rendu sinon.
 */
/** Délai sans chargement avant d'afficher le décor d'évènement (ms). */
const DECOR_SETTLE_MS = 80;

export const Footer = ({ compact = false }: { compact?: boolean }) => {
  // Depuis une page légale, l'autre s'ouvre en `replace` : les deux pages ne
  // s'empilent pas dans l'historique, « Retour » ramène à l'écran d'origine.
  const onLegal = /^\/(mentions-legales|confidentialite)$/.test(
    useLocation().pathname,
  );
  // À propos et Nouveautés : pages du site, donc une fois connecté (le pied
  // de page s'affiche aussi sur l'écran de connexion).
  const loggedIn = !!useSession().sessionData?.user;
  // Page en chargement (monogramme demandé ou encore à l'écran) : le pied de
  // page attend et arrive en fondu avec le reste, pas seul avant lui. Sa place
  // reste réservée : rien ne saute.
  const busy = useSyncExternalStore(subscribeScreenLoader, screenLoaderBusy);
  // Décor d'évènement (bougies d'Halloween…) posé sur le filet, plus de place
  // au-dessus pour lui. Pas sur les écrans pleine hauteur (`compact`) : il
  // mordrait sur la carte, la roue…
  const Decor = compact ? undefined : eventTheme()?.FooterDecor;
  // Le décor n'arrive que pied de page au repos : en venant d'un écran sans
  // décor (admin…), la page qui s'ouvre réclame son chargement une image
  // APRÈS ce rendu — le décor apparaissait pendant que le pied de page
  // s'effaçait. On attend donc un court instant sans chargement ; une fois là,
  // il reste (et s'efface avec le pied de page comme le reste).
  const [decorShown, setDecorShown] = useState(false);
  if (!Decor && decorShown) setDecorShown(false);
  useEffect(() => {
    if (!Decor || busy || decorShown) return;
    const t = setTimeout(() => setDecorShown(true), DECOR_SETTLE_MS);
    return () => clearTimeout(t);
  }, [Decor, busy, decorShown]);
  // Séparateur « · » : sur une ligne (desktop) seulement. Sur mobile, les
  // liens passent à la ligne et un point en bout de ligne flotterait.
  const dot = (
    <span aria-hidden="true" className="hidden sm:inline">
      ·
    </span>
  );
  return (
    <footer
      className={cn(
        // Mobile : les liens en haut, sur une ou deux lignes aérées, la
        // mention « Infflunch 2026 » dessous. Desktop : tout sur une ligne.
        "relative flex shrink-0 flex-col items-center gap-1.5 text-center text-xs text-foreground/45 sm:flex-row sm:justify-center sm:gap-2 sm:text-[11px]",
        // Même filet et même hauteur partout ; `compact` retire seulement la
        // marge au-dessus (le footer est déjà calé en bas de l'écran).
        "border-t border-border pt-2.5 sm:pt-3",
        "transition-opacity duration-300 ease-out",
        busy && "pointer-events-none opacity-0",
        // iPhone (site installé, plein écran) : la barre d'accueil d'iOS est
        // dessinée par-dessus le bas de page. On ne réserve que ce qu'il faut
        // pour passer au-dessus d'elle, pas toute la zone (34 px), qui
        // laissait trop de vide. Nécessite `viewport-fit=cover` (index.html).
        "pb-[max(0.625rem,calc(env(safe-area-inset-bottom)-0.75rem))] sm:pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.75rem))]",
        !compact && (Decor ? "mt-10 sm:mt-12" : "mt-4 sm:mt-8"),
      )}
    >
      {Decor && decorShown && <Decor />}
      <span className="order-last sm:order-none">Infflunch 2026</span>
      {dot}
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-x-2">
        {loggedIn && (
          <>
            <Link to="/a-propos" className={linkCls}>
              À propos
            </Link>
            {dot}
            <Link to="/faq" className={linkCls}>
              FAQ
            </Link>
            {dot}
            <Link to="/nouveautes" className={linkCls}>
              Nouveautés
            </Link>
            {dot}
          </>
        )}
        <Link to="/mentions-legales" replace={onLegal} className={linkCls}>
          Mentions légales
        </Link>
        {dot}
        <Link to="/confidentialite" replace={onLegal} className={linkCls}>
          Confidentialité
        </Link>
      </nav>
    </footer>
  );
};

export default Footer;

import { createContext, useContext } from "react";

/**
 * Vrai une fois la page affichée (ce PageReveal ou un PageReveal qui le
 * contient) ; faux hors de toute page.
 *
 * RÈGLE : le monogramme de chargement n'apparaît qu'à l'ARRIVÉE sur une page,
 * qui ne s'affiche qu'une fois tout chargé et le monogramme effacé. Ce qui
 * charge ensuite dans une page déjà affichée (sous-onglet, changement de
 * vue…) attend sans monogramme et apparaît en fondu : jamais de monogramme
 * par-dessus une page visible (cf. useScreenLoader, ScreenLoader).
 *
 * Sert aussi à ce qu'une page pose HORS du bloc révélé (portail) et qui doit
 * apparaître avec elle.
 */
export const PageRevealedContext = createContext(false);

export const usePageRevealed = () => useContext(PageRevealedContext);

import { createContext, useContext } from "react";

/** Vrai une fois la page révélée par PageReveal (vrai hors PageReveal). Pour
 *  ce qu'une page pose HORS du bloc révélé (portail) et qui doit apparaître
 *  avec elle. */
export const PageRevealedContext = createContext(true);

export const usePageRevealed = () => useContext(PageRevealedContext);

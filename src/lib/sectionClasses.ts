/**
 * Sections de la fiche restaurant (Coordonnées, Menu, Photos, Avis…).
 * Desktop : carte bordée avec titre à l'intérieur. Mobile : petit libellé
 * au-dessus du contour, le contour n'entourant que le contenu.
 */
export const SECTION =
  "sm:rounded-card sm:border sm:border-border sm:bg-card sm:p-5";
export const SECTION_HEAD =
  "mb-1 flex flex-wrap items-center justify-between gap-3 px-1 sm:mb-4 sm:px-0";
export const SECTION_TITLE =
  "font-display text-[13px] font-semibold text-foreground/55 sm:text-lg sm:font-bold sm:text-card-foreground";
/** Contenu : bordé sur mobile uniquement (bord à bord, pas de padding). */
export const SECTION_BODY =
  "overflow-hidden rounded-card border border-border bg-card sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent";
/** Idem avec padding intérieur sur mobile. */
export const SECTION_BODY_PAD = SECTION_BODY + " p-3 sm:p-0";
/** Bouton d'ajout : icône nue sur mobile, bouton plein sur desktop. */
export const ADD_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg p-1 text-primary transition sm:bg-primary sm:px-3.5 sm:py-1.5 sm:text-sm sm:font-medium sm:text-primary-foreground sm:hover:bg-primary/90";

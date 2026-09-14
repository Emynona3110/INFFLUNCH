/**
 * Vignette qui grossit légèrement au survol, SANS devenir floue : l'image est
 * posée à 105 % de sa case et réduite (scale .952) au repos, puis ramenée à
 * 100 % au survol. Le navigateur rasterise à la taille de mise en page (la
 * grande) et ne fait que réduire — un `scale-105` classique agrandit un
 * bitmap rendu petit, et Safari ne le redessine jamais net.
 * Le parent doit être `relative overflow-hidden`.
 */
export const HOVER_ZOOM_IMG =
  "absolute inset-[-2.5%] h-[105%] w-[105%] max-w-none object-cover scale-[.952] transition-transform duration-300 group-hover:scale-100";

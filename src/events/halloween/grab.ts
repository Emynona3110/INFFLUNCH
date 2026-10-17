/** Matrice écran du centre d'un élément HTML (sans rotation), pour CandyGrab. */
export const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return new DOMMatrix([1, 0, 0, 1, r.left + r.width / 2, r.top + r.height / 2]);
};

/** L'appareil demande moins d'animations : pas de copie qui grossit. */
export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

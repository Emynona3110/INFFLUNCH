/** URL de la fiche d'un restaurant : /restaurants/<slug>, sous la liste. */
export const restaurantPath = (slug: string) => `/restaurants/${slug}`;

/** Vrai sur une fiche (/restaurants/<slug>), faux sur la liste elle-même. */
export const isRestaurantDetailPath = (pathname: string) =>
  /^\/restaurants\/[^/]+/.test(pathname);

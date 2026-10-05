/**
 * Images de couverture redimensionnées par Supabase (Image Transformations,
 * offre Pro uniquement) : on télécharge ~600 px au lieu des 2000 px stockés.
 *
 * Désactivé tant que `VITE_IMAGE_TRANSFORMS` ne vaut pas "true" : en offre
 * gratuite, l'endpoint `render` répond en erreur. Même activé, une image en
 * échec retombe sur l'original (cf. main.tsx, `data-original`).
 */
const ENABLED = import.meta.env.VITE_IMAGE_TRANSFORMS === "true";
const PUBLIC_MARKER = "/storage/v1/object/public/";

/** Largeurs servies : vignettes/cartes, et grand visuel de la fiche. */
export const IMG_THUMB = 640;
export const IMG_HERO = 1600;

/** URL redimensionnée d'une image du Storage Supabase ; toute autre URL
 *  (image locale, ancien lien externe) est rendue telle quelle. */
export function resizedImage(url: string, width: number): string {
  if (!ENABLED || !url.includes(PUBLIC_MARKER)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url.replace(PUBLIC_MARKER, "/storage/v1/render/image/public/")}${sep}width=${width}&quality=75`;
}

/** Props `src` + repli sur l'original à poser sur un <img>. */
export function resizedImgProps(url: string, width: number) {
  const src = resizedImage(url, width);
  return src === url ? { src } : { src, "data-original": url };
}

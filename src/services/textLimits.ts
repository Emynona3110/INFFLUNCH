/**
 * Longueur maximale des textes libres saisis dans l'appli (avis, demandes,
 * notes de backlog). Même valeur que les contraintes CHECK en base — voir
 * `sql/2026-09-13_limite_textes.sql`.
 */
export const MAX_TEXT = 1000;

/** Descriptif d'une photo : une ligne, pas un paragraphe (CHECK en base,
 *  `sql/2026-09-13_photos_caption.sql`). */
export const PHOTO_CAPTION_MAX = 100;

/** Images jointes à une demande (CHECK en base,
 *  `sql/2026-09-18_feedback_images.sql`). */
export const FEEDBACK_IMAGES_MAX = 3;

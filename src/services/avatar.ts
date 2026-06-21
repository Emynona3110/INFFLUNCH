import supabaseClient from "./supabaseClient";

export const AVATARS_BUCKET = "avatars";

/**
 * Clé du fichier avatar : préfixe de l'email (avant le @), nettoyé pour un nom
 * de fichier valide, + ".webp". Écrasé à chaque changement. Ex :
 *   "cdubois@infflux.com" → "cdubois.webp".
 */
export const avatarKey = (email: string | null | undefined): string | null => {
  const local = (email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  return local ? `${local}.webp` : null;
};

/**
 * URL publique de l'avatar d'un utilisateur, ou null s'il n'en a pas.
 * `avatarUpdatedAt` (de profiles) sert de version : `?v=` busté au changement
 * (le chemin étant fixe, sans ça le cache afficherait l'ancienne image).
 */
export const avatarUrl = (
  email: string | null | undefined,
  avatarUpdatedAt: string | null | undefined
): string | null => {
  const key = avatarKey(email);
  if (!key || !avatarUpdatedAt) return null;
  const base = supabaseClient.storage.from(AVATARS_BUCKET).getPublicUrl(key).data
    .publicUrl;
  return `${base}?v=${new Date(avatarUpdatedAt).getTime()}`;
};

import supabaseClient from "./supabaseClient";

export const AVATARS_BUCKET = "avatars";

/**
 * Chemin d'un nouvel avatar : dossier par utilisateur + nom ALÉATOIRE →
 * "{userId}/{uuid}.webp". URL publique non devinable (sécurité) et chaque
 * changement produit un nouveau chemin (l'ancien est supprimé par useProfile).
 */
export const newAvatarPath = (userId: string) =>
  `${userId}/${crypto.randomUUID()}.webp`;

/** URL publique de l'avatar à partir de son chemin (null si pas de pp). Un
 *  chemin absolu (« /easter/… ») est une image du site, servie telle quelle :
 *  profil fictif de Rick Astley. */
export const avatarUrl = (
  avatarPath: string | null | undefined
): string | null => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("/")) return avatarPath;
  return supabaseClient.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath).data
    .publicUrl;
};

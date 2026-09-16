/**
 * URL d'un profil : /profil/<local-part de l'email> (ex. /profil/cdubois),
 * plus parlant qu'un uuid. L'id sert de repli sans email ; la page profil
 * accepte les deux et résout le pseudo via la table `users`.
 */
export const profileHandle = (email: string | null | undefined) =>
  email?.split("@")[0]?.toLowerCase() || null;

export const profilePath = (userId: string, email?: string | null) =>
  `/profil/${profileHandle(email) ?? userId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

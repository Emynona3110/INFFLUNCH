/**
 * Dérive un nom d'affichage et un trigramme depuis l'email INFFLUX d'un auteur
 * (avis). Convention : on retire @domaine, la 1re lettre = initiale du prénom,
 * le reste du local-part = nom de famille.
 * Limite assumée : pas d'accents (non reconstituables depuis l'email).
 *   "cdubois@infflux.com" → "C.Dubois" / trigramme "CDS".
 */
export const formatAuthorName = (email: string | null | undefined): string => {
  // Sans email = contribution anonymisée (compte supprimé, avis conservé).
  if (!email) return "Ancien collaborateur";
  const local = email.split("@")[0];
  if (!local) return email;
  const first = local[0].toUpperCase();
  const lastName = local.slice(1);
  return `${first}.${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}`;
};

/** Trigramme des avatars sans photo : initiale du prénom, puis première et
 *  dernière lettre du nom (« cdubois » → « CDS »). */
export const authorTrigram = (email: string | null | undefined): string => {
  if (!email) return "?";
  const local = email.split("@")[0];
  const lastName = local.slice(1);
  return `${local[0] ?? ""}${lastName[0] ?? ""}${lastName.length > 1 ? lastName[lastName.length - 1] : ""}`.toUpperCase();
};

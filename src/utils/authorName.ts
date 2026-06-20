/**
 * Dérive un nom d'affichage et des initiales depuis l'email INFFLUX d'un auteur
 * (avis). Convention : on retire @domaine, la 1re lettre = initiale du prénom,
 * le reste du local-part = nom de famille.
 * Limite assumée : pas d'accents (non reconstituables depuis l'email).
 *   "cdubois@infflux.com" → "C.Dubois" / initiales "CD".
 */
export const formatAuthorName = (email: string | null | undefined): string => {
  if (!email) return "Anonyme";
  const local = email.split("@")[0];
  if (!local) return email;
  const first = local[0].toUpperCase();
  const lastName = local.slice(1);
  return `${first}.${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}`;
};

export const authorInitials = (email: string | null | undefined): string => {
  if (!email) return "?";
  const local = email.split("@")[0];
  return `${local[0] ?? ""}${local[1] ?? ""}`.toUpperCase();
};

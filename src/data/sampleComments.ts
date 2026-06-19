/**
 * Avis d'exemple (maquette). La table et la partie fonctionnelle seront créées
 * ensuite ; ces données servent uniquement à valider le visuel de la section.
 *
 * `email` = email INFFLUX de l'auteur. Le nom affiché en est dérivé (cf.
 * formatAuthorName) : on retire @infflux.com, la 1re lettre = initiale du
 * prénom, le reste = nom de famille → "cdubois" → "C.Dubois". Limite connue :
 * pas d'accents (on ne peut pas les reconstituer depuis l'email).
 */
export interface SampleComment {
  id: number;
  email: string;
  date: string; // ISO
  rating: number; // 0..5
  text: string;
}

export const sampleComments: SampleComment[] = [
  {
    id: 1,
    email: "cdubois@infflux.com",
    date: "2026-05-28",
    rating: 5,
    text: "Parfait pour la pause déj entre collègues : service rapide, portions généreuses et c'est à deux pas du bureau. On y retourne dès la semaine prochaine !",
  },
  {
    id: 2,
    email: "hmartin@infflux.com",
    date: "2026-05-14",
    rating: 4,
    text: "Très bon rapport qualité-prix. Le plat du jour change tout le temps, ça évite la lassitude. Un peu de monde entre 12h30 et 13h, pensez à réserver.",
  },
  {
    id: 3,
    email: "snguyen@infflux.com",
    date: "2026-04-30",
    rating: 5,
    text: "Mon adresse préférée du quartier. Les options végé sont vraiment travaillées, ce qui est rare par ici. Mention spéciale au dessert maison.",
  },
  {
    id: 4,
    email: "tleroy@infflux.com",
    date: "2026-04-12",
    rating: 3,
    text: "Bon dans l'ensemble mais l'attente était un peu longue le jour où on y est allés en équipe. La cuisine reste de qualité, je retenterai sur un créneau plus calme.",
  },
  {
    id: 5,
    email: "lbernard@infflux.com",
    date: "2026-03-22",
    rating: 4,
    text: "Cadre agréable et accueil sympa. Idéal pour un déjeuner un peu plus posé quand on veut sortir du rythme cantine. Les prix restent raisonnables.",
  },
];

/**
 * "cdubois@infflux.com" → "C.Dubois". Première lettre = initiale du prénom,
 * le reste du local-part = nom de famille (capitalisé).
 */
export const formatAuthorName = (email: string): string => {
  const local = email.split("@")[0];
  if (!local) return email;
  const first = local[0].toUpperCase();
  const lastName = local.slice(1);
  return `${first}.${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}`;
};

/** Initiales pour l'avatar : initiale prénom + initiale nom ("cdubois" → "CD"). */
export const authorInitials = (email: string): string => {
  const local = email.split("@")[0];
  return `${local[0] ?? ""}${local[1] ?? ""}`.toUpperCase();
};

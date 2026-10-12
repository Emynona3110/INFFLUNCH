// Easter egg « Never Gonna Give You Up » : Rick Astley, collègue fictif. Il
// n'existe pas en base ; il n'apparaît dans le classement qu'en le cherchant
// (rick, astley…) et son profil (/profil/rastley) est rendu côté front.
// L'ouvrir débloque le succès secret `leaderboard_rick`.
import { ACHIEVEMENTS } from "@/data/achievements";
import type { LeaderboardRow } from "@/hooks/useLeaderboard";
import type { PublicProfile } from "@/hooks/usePublicProfile";

/** Même convention que les vrais comptes : « R.Astley », trigramme « RAY ». */
export const RICK_EMAIL = "rastley@infflux.com";
export const RICK_HANDLE = "rastley";
/** Id factice (jamais un uuid : ne peut pas croiser un vrai compte). */
export const RICK_ID = "rick-astley";
/** Photo locale (public/easter/), servie sans passer par le stockage. */
const RICK_AVATAR = "/easter/rick_astley.webp";

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche du classement qui fait apparaître Rick (4 lettres minimum). */
export const isRickSearch = (search: string) => {
  const needle = fold(search.trim());
  return (
    needle.length >= 4 &&
    ["rick astley", "r.astley"].some((name) => name.includes(needle))
  );
};

/** Sortie du single au Royaume-Uni. */
const SINCE = "1987-07-27T12:00:00Z";
/** Série = jours écoulés depuis la sortie : il ne l'a jamais lâchée. */
const STREAK = Math.floor((Date.now() - Date.parse(SINCE)) / 86_400_000);
/** Photos = mois de sortie (juillet). */
const PHOTOS = 7;

export const RICK_ROW: LeaderboardRow = {
  user_id: RICK_ID,
  email: RICK_EMAIL,
  avatar_path: RICK_AVATAR,
  streak: STREAK,
  lunches: STREAK,
  reviews: 1987,
  photos: PHOTOS,
  achievements: ACHIEVEMENTS.length,
};

/** Profil : tous les succès, obtenus le jour de la sortie du single. */
export const RICK_PROFILE: PublicProfile = {
  email: RICK_EMAIL,
  avatar_path: RICK_AVATAR,
  member_since: SINCE,
  reviews_count: 1987,
  photos_count: PHOTOS,
  lunches_count: STREAK,
  lunch_streak: STREAK,
  achievements: ACHIEVEMENTS.map((a) => ({
    achievement_id: a.id,
    unlocked_at: SINCE,
  })),
};

/** Le clip, à la place des succès et des avis (lancé d'office). */
export const RICK_VIDEO = {
  id: "dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up",
};

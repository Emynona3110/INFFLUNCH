// Easter egg « Never Gonna Give You Up » : Rick Astley, collègue fictif. Il
// n'existe pas en base ; il n'apparaît dans le classement qu'en le cherchant
// (rick, astley…) et son profil (/profil/rastley) est rendu côté front.
// L'ouvrir débloque le succès secret `leaderboard_rick`.
import { ACHIEVEMENTS } from "@/data/achievements";
import type { LeaderboardRow } from "@/hooks/useLeaderboard";
import type { PublicProfile } from "@/hooks/usePublicProfile";
import type { UserReview } from "@/hooks/useUserReviews";

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

const SINCE = "1987-07-27T12:00:00Z";
const STREAK = 14000;

export const RICK_ROW: LeaderboardRow = {
  user_id: RICK_ID,
  email: RICK_EMAIL,
  avatar_path: RICK_AVATAR,
  streak: STREAK,
  lunches: STREAK,
  reviews: 1987,
  photos: 87,
  achievements: ACHIEVEMENTS.length,
};

/** Profil : tous les succès, obtenus le jour de la sortie du single. */
export const RICK_PROFILE: PublicProfile = {
  email: RICK_EMAIL,
  avatar_path: RICK_AVATAR,
  member_since: SINCE,
  reviews_count: 1987,
  photos_count: 87,
  lunches_count: STREAK,
  lunch_streak: STREAK,
  achievements: ACHIEVEMENTS.map((a) => ({
    achievement_id: a.id,
    unlocked_at: SINCE,
  })),
};

/** Son unique avis visible, sur un resto qui n'existe pas (le lien mène au
 *  mouton : slug inconnu). */
export const RICK_REVIEWS: UserReview[] = [
  {
    id: -1,
    restaurant_id: -1,
    user_id: RICK_ID,
    rating: 5,
    comment:
      "Je ne laisserai jamais tomber cette adresse. Jamais. Et je ne vous mentirai jamais : c'est le meilleur burger depuis 1987.",
    created_at: SINCE,
    updated_at: SINCE,
    restaurant: {
      name: "Rick's Diner",
      slug: "ricks-diner",
      image: null,
      contributions_enabled: false,
    },
  },
];

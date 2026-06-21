import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";

export interface Review {
  id: number;
  restaurant_id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  /** Email de l'auteur (jointure public.users), pour l'affichage du nom. */
  email: string | null;
  /** Chemin de l'avatar de l'auteur (jointure profiles) ; null = pas de pp. */
  avatar_path: string | null;
}

/**
 * Avis d'un restaurant, triés du plus récent au plus ancien. La table reviews
 * référence auth.users (pas de FK directe vers public.users), donc on joint
 * manuellement public.users pour récupérer l'email → nom affiché.
 * Les agrégats (restaurants.rating/reviews) sont, eux, maintenus côté serveur
 * par trigger : ce hook ne sert qu'à lister/écrire les avis détaillés.
 */
const useReviews = (restaurantId: number | undefined) =>
  useQuery<Review[], Error>({
    queryKey: ["reviews", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("reviews")
        .select("id, restaurant_id, user_id, rating, comment, created_at, updated_at")
        .eq("restaurant_id", restaurantId as number)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id))];

      let emailById: Record<string, string> = {};
      let avatarById: Record<string, string | null> = {};
      if (ids.length) {
        const [{ data: users }, { data: profiles }] = await Promise.all([
          supabaseClient.from("users").select("id, email").in("id", ids),
          supabaseClient
            .from("profiles")
            .select("id, avatar_path")
            .in("id", ids),
        ]);
        emailById = Object.fromEntries(
          (users ?? []).map((u) => [u.id as string, u.email as string])
        );
        avatarById = Object.fromEntries(
          (profiles ?? []).map((p) => [
            p.id as string,
            p.avatar_path as string | null,
          ])
        );
      }

      return rows.map((r) => ({
        ...r,
        email: emailById[r.user_id] ?? null,
        avatar_path: avatarById[r.user_id] ?? null,
      }));
    },
  });

export default useReviews;

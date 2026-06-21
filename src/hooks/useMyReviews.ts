import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";

export interface MyReview {
  id: number;
  restaurant_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  restaurant: { name: string; slug: string; image: string | null } | null;
}

/**
 * Tous les avis de l'utilisateur courant, du plus récent au plus ancien, avec
 * les infos du restaurant (nom/slug/image) pour les lister et y renvoyer.
 */
const useMyReviews = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;

  return useQuery<MyReview[], Error>({
    queryKey: ["my-reviews", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("reviews")
        .select(
          "id, restaurant_id, rating, comment, created_at, updated_at, restaurants(name, slug, image)"
        )
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      return (data ?? []).map((r: any) => ({
        id: r.id,
        restaurant_id: r.restaurant_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        updated_at: r.updated_at,
        restaurant: r.restaurants ?? null,
      }));
    },
  });
};

export default useMyReviews;

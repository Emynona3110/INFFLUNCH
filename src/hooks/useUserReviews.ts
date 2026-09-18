import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useIsAdmin from "./useIsAdmin";

export interface UserReview {
  id: number;
  restaurant_id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  /** Le restaurant noté (embed) ; null si sa fiche est invisible pour l'appelant. */
  restaurant: {
    name: string;
    slug: string;
    image: string | null;
    contributions_enabled: boolean | null;
  } | null;
}

/**
 * Avis laissés par un collaborateur (page profil), meilleures notes en tête
 * puis du plus récent au plus ancien, avec le restaurant concerné. Le resto de test reste réservé aux
 * admins, comme partout. La suppression (own / admin, même RLS que sur la
 * fiche) rafraîchit le profil, la fiche resto et la liste des restos.
 */
const useUserReviews = (userId: string | null) => {
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const key = ["user-reviews", userId, isAdmin];

  const reviews = useQuery<UserReview[], Error>({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("reviews")
        .select(
          "id, restaurant_id, user_id, rating, comment, created_at, updated_at, restaurants(name, slug, image, contributions_enabled)"
        )
        .eq("user_id", userId as string)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((row) => {
          const { restaurants, ...r } = row as unknown as Omit<
            UserReview,
            "restaurant"
          > & { restaurants: UserReview["restaurant"] };
          return { ...r, restaurant: restaurants };
        })
        .filter((r) => isAdmin || r.restaurant?.slug !== "test");
    },
  });

  const remove = useMutation({
    mutationFn: async (review: UserReview) => {
      const { error } = await supabaseClient
        .from("reviews")
        .delete()
        .eq("id", review.id);
      if (error) throw new Error(error.message);
      return review;
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews", userId] });
      queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
      queryClient.invalidateQueries({
        queryKey: ["reviews", review.restaurant_id],
      });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });

  return { reviews, remove };
};

export default useUserReviews;

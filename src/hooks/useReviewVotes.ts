import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import {
  patchQueries,
  rollbackQueries,
  settleWhenIdle,
} from "../lib/optimistic";

interface VoteRow {
  id: number;
  review_id: number;
  user_id: string;
  value: number; // -1 | 1
}

/**
 * Votes (upvote/downvote, style Reddit) sur un lot d'avis, récupérés en une
 * requête. Renvoie le score et le vote courant par avis, et `vote()` qui pose,
 * change ou retire (clic sur le vote déjà actif) le vote de l'utilisateur.
 */
const useReviewVotes = (reviewIds: number[]) => {
  const queryClient = useQueryClient();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;

  const idsKey = [...reviewIds].sort((a, b) => a - b);

  const query = useQuery<Record<number, VoteRow[]>, Error>({
    queryKey: ["review-votes", idsKey],
    enabled: reviewIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("review_votes")
        .select("id, review_id, user_id, value")
        .in("review_id", reviewIds);
      if (error) throw new Error(error.message);

      const grouped: Record<number, VoteRow[]> = {};
      for (const r of (data ?? []) as VoteRow[]) {
        (grouped[r.review_id] ??= []).push(r);
      }
      return grouped;
    },
  });

  const scoreFor = (reviewId: number) =>
    (query.data?.[reviewId] ?? []).reduce((s, v) => s + v.value, 0);

  const myVoteFor = (reviewId: number): number =>
    (query.data?.[reviewId] ?? []).find((v) => v.user_id === myId)?.value ?? 0;

  // Écriture optimiste (src/lib/optimistic.ts) : le score bouge au clic.
  // L'intention (voter, ou retirer mon vote = 0) est fixée AU CLIC.
  const writeKey = ["review-votes-write"];
  const mutation = useMutation({
    mutationKey: writeKey,
    scope: { id: "review-votes-write" },
    mutationFn: async ({
      reviewId,
      value,
    }: {
      reviewId: number;
      value: 1 | -1 | 0;
    }) => {
      if (!myId) throw new Error("Non connecté");
      if (value === 0) {
        const { error } = await supabaseClient
          .from("review_votes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", myId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseClient
          .from("review_votes")
          .upsert(
            { review_id: reviewId, value, user_id: myId },
            { onConflict: "user_id,review_id" }
          );
        if (error) throw new Error(error.message);
      }
    },
    onMutate: ({ reviewId, value }) =>
      patchQueries(queryClient, [
        [
          ["review-votes"],
          (prev: Record<number, VoteRow[]>) => {
            if (!(reviewId in prev) && value === 0) return prev;
            const others = (prev[reviewId] ?? []).filter(
              (v) => v.user_id !== myId
            );
            return {
              ...prev,
              [reviewId]: value
                ? [
                    ...others,
                    { id: -Date.now(), review_id: reviewId, user_id: myId as string, value },
                  ]
                : others,
            };
          },
        ],
      ]),
    onError: (_e, _v, context) => rollbackQueries(queryClient, context),
    onSettled: () =>
      settleWhenIdle(queryClient, writeKey, () =>
        queryClient.invalidateQueries({ queryKey: ["review-votes"] })
      ),
  });

  return {
    scoreFor,
    myVoteFor,
    // Clic sur le vote déjà actif → on le retire ; sinon on pose/change.
    vote: (reviewId: number, value: 1 | -1) =>
      mutation.mutate({
        reviewId,
        value: myVoteFor(reviewId) === value ? 0 : value,
      }),
    canVote: !!myId,
  };
};

export default useReviewVotes;

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import useRestaurantSuggestions from "./useRestaurantSuggestions";

/**
 * Puce « l'admin a tranché une de mes propositions de resto » : la décision la
 * plus récente (`handled_at`) comparée à `profiles.suggestions_seen_at`. Même
 * principe que `useFeedbackSeen` (en base, commun à tous les appareils).
 *
 * `seenAt` est exposé pour que la liste marque une à une les propositions
 * tranchées depuis la dernière visite.
 */
const useSuggestionsSeen = (enabled = true) => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const { data: items = [] } = useRestaurantSuggestions("mine", enabled);
  const queryKey = ["suggestions-seen", userId];

  const { data: seenAt, isPending } = useQuery<string>({
    queryKey,
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("suggestions_seen_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.suggestions_seen_at ?? "";
    },
  });

  // Dates ISO UTC venues de Postgres : comparaison lexicographique fiable.
  const latest = items.reduce(
    (max, item) => (item.handled_at && item.handled_at > max ? item.handled_at : max),
    "",
  );
  const ready = enabled && !!userId && !isPending;

  const markSeen = useCallback(async () => {
    if (!ready || !latest) return;
    const current = queryClient.getQueryData<string>(queryKey) ?? "";
    if (latest <= current) return;
    queryClient.setQueryData(queryKey, latest);
    await supabaseClient
      .from("profiles")
      .upsert({ id: userId, suggestions_seen_at: latest });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, latest, queryClient]);

  const hasUnseen = ready && !!latest && latest > (seenAt ?? "");

  return { hasUnseen, markSeen, seenAt: ready ? (seenAt ?? "") : null };
};

export default useSuggestionsSeen;

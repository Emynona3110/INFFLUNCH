import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";

export type ReactionTarget = "review" | "photo";

/** Palette du sélecteur d'emojis (style Discord). */
export const REACTION_EMOJIS = [
  "😍", // cœurs dans les yeux
  "😂", // rire
  "😋", // se lèche les lèvres
  "😠", // colère
  "😢", // pleure
] as const;

interface ReactionRow {
  id: number;
  target_type: ReactionTarget;
  target_id: number;
  user_id: string;
  emoji: string;
}

export interface ReactionSummary {
  /** emoji → nombre de réactions. */
  counts: Record<string, number>;
  /** emojis posés par l'utilisateur courant. */
  mine: Set<string>;
}

/**
 * Réactions emoji sur un ensemble de cibles (avis OU photos), récupérées en une
 * requête. Renvoie un résumé par cible (compteurs + mes emojis) et un toggle.
 * Le user_id à l'insertion vient du défaut SQL (auth.uid()).
 */
const useReactions = (targetType: ReactionTarget, targetIds: number[]) => {
  const queryClient = useQueryClient();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;

  // Clé stable indépendante de l'ordre des ids.
  const idsKey = [...targetIds].sort((a, b) => a - b);

  const query = useQuery<Record<number, ReactionRow[]>, Error>({
    queryKey: ["reactions", targetType, idsKey],
    enabled: targetIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("reactions")
        .select("id, target_type, target_id, user_id, emoji")
        .eq("target_type", targetType)
        .in("target_id", targetIds);
      if (error) throw new Error(error.message);

      const grouped: Record<number, ReactionRow[]> = {};
      for (const r of (data ?? []) as ReactionRow[]) {
        (grouped[r.target_id] ??= []).push(r);
      }
      return grouped;
    },
  });

  const summaryFor = (targetId: number): ReactionSummary => {
    const rows = query.data?.[targetId] ?? [];
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const r of rows) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (r.user_id === myId) mine.add(r.emoji);
    }
    return { counts, mine };
  };

  const mutation = useMutation({
    mutationFn: async ({
      targetId,
      emoji,
    }: {
      targetId: number;
      emoji: string;
    }) => {
      if (!myId) throw new Error("Non connecté");
      // Un seul emoji par cible et par utilisateur.
      const myRows = (query.data?.[targetId] ?? []).filter(
        (r) => r.user_id === myId
      );
      const sameEmoji = myRows.find((r) => r.emoji === emoji);

      if (sameEmoji) {
        // Reclic sur l'emoji actif → on le retire.
        const { error } = await supabaseClient
          .from("reactions")
          .delete()
          .eq("id", sameEmoji.id);
        if (error) throw new Error(error.message);
        return;
      }

      // On retire l'éventuel autre emoji posé avant d'ajouter le nouveau.
      if (myRows.length) {
        const { error: delErr } = await supabaseClient
          .from("reactions")
          .delete()
          .in(
            "id",
            myRows.map((r) => r.id)
          );
        if (delErr) throw new Error(delErr.message);
      }
      const { error } = await supabaseClient.from("reactions").insert({
        target_type: targetType,
        target_id: targetId,
        emoji,
      });
      if (error) throw new Error(error.message);
    },
    // On rafraîchit toutes les réactions de ce type (clé partielle).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactions", targetType] });
      queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
    },
  });

  return {
    summaryFor,
    toggle: (targetId: number, emoji: string) =>
      mutation.mutate({ targetId, emoji }),
    canReact: !!myId,
    isPending: query.isPending,
  };
};

export default useReactions;

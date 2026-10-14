import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import {
  patchQueries,
  rollbackQueries,
  settleWhenIdle,
} from "../lib/optimistic";

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

  // Écriture optimiste (src/lib/optimistic.ts). L'intention — poser cet
  // emoji, ou retirer le mien — est fixée AU CLIC, d'après ce qui est affiché :
  // la requête, elle, ne dépend plus d'ids lus avant (des lignes optimistes
  // n'en ont pas de vrai). Un seul emoji par cible et par utilisateur : on
  // efface toujours les miens, puis on pose le nouveau s'il y en a un.
  const writeKey = ["reactions-write", targetType];
  const mutation = useMutation({
    mutationKey: writeKey,
    scope: { id: `reactions-write-${targetType}` },
    mutationFn: async ({
      targetId,
      emoji,
    }: {
      targetId: number;
      /** null = retirer ma réaction. */
      emoji: string | null;
    }) => {
      if (!myId) throw new Error("Non connecté");
      const { error: delErr } = await supabaseClient
        .from("reactions")
        .delete()
        .match({ target_type: targetType, target_id: targetId, user_id: myId });
      if (delErr) throw new Error(delErr.message);
      if (emoji == null) return;
      const { error } = await supabaseClient.from("reactions").insert({
        target_type: targetType,
        target_id: targetId,
        emoji,
      });
      if (error) throw new Error(error.message);
    },
    onMutate: ({ targetId, emoji }) =>
      patchQueries(queryClient, [
        [
          ["reactions", targetType],
          (prev: Record<number, ReactionRow[]>) => {
            if (!(targetId in prev) && !emoji) return prev;
            const others = (prev[targetId] ?? []).filter(
              (r) => r.user_id !== myId
            );
            return {
              ...prev,
              [targetId]: emoji
                ? [
                    ...others,
                    {
                      id: -Date.now(),
                      target_type: targetType,
                      target_id: targetId,
                      user_id: myId as string,
                      emoji,
                    },
                  ]
                : others,
            };
          },
        ],
      ]),
    onError: (_e, _v, context) => rollbackQueries(queryClient, context),
    // On rafraîchit toutes les réactions de ce type (clé partielle).
    onSettled: () =>
      settleWhenIdle(queryClient, writeKey, () => {
        queryClient.invalidateQueries({ queryKey: ["reactions", targetType] });
        queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
      }),
  });

  return {
    summaryFor,
    // Reclic sur l'emoji actif → on le retire ; sinon il remplace le mien.
    toggle: (targetId: number, emoji: string) =>
      mutation.mutate({
        targetId,
        emoji: summaryFor(targetId).mine.has(emoji) ? null : emoji,
      }),
    canReact: !!myId,
    isPending: query.isPending,
  };
};

export default useReactions;

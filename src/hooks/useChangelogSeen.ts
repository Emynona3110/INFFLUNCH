import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { latestChangelogDate } from "@/data/changelog";
import useSession from "./useSession";

/**
 * Suit la dernière nouveauté « vue » par l'utilisateur (date de l'entrée la
 * plus récente consultée), pour la pastille sur l'onglet « Nouveautés » et sur
 * chaque entrée pas encore lue. Stocké EN BASE (`profiles.changelog_seen_at`),
 * comme les succès : propre à chaque compte et commun à tous ses appareils —
 * le localStorage d'avant confondait les comptes d'un même navigateur et
 * oubliait tout ailleurs.
 *
 * `seenAt` est aussi exposé pour que la section marque une à une les
 * nouveautés plus récentes que la dernière visite.
 */
const useChangelogSeen = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["changelog-seen", userId];

  const { data: seenAt, isPending } = useQuery<string>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("changelog_seen_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      // Colonne `date` → "AAAA-MM-JJ", même format que les entrées du
      // changelog : comparaison lexicographique fiable. "" = jamais vu.
      return data?.changelog_seen_at ?? "";
    },
  });

  // Tant que la date « vue » n'est pas chargée, pas de pastille : mieux vaut
  // un léger retard qu'un clignotement à chaque ouverture.
  const ready = !!userId && !isPending;

  const markSeen = useCallback(async () => {
    if (!ready) return;
    const current = queryClient.getQueryData<string>(queryKey) ?? "";
    if (latestChangelogDate <= current) return;
    // Optimiste : la pastille s'éteint tout de suite, la base suit.
    queryClient.setQueryData(queryKey, latestChangelogDate);
    await supabaseClient
      .from("profiles")
      .upsert({ id: userId, changelog_seen_at: latestChangelogDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, queryClient]);

  const hasUnseen = ready && latestChangelogDate > (seenAt ?? "");

  return { hasUnseen, markSeen, seenAt: ready ? (seenAt ?? "") : null };
};

export default useChangelogSeen;

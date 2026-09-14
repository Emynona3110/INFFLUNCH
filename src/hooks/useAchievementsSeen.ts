import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import useAchievements from "./useAchievements";

/**
 * Suit le dernier succès « vu » par l'utilisateur (date de déblocage la plus
 * récente consultée), pour la pastille sur « Mon Profil » et sur l'onglet
 * « Succès ». Stocké EN BASE (`profiles.achievements_seen_at`) : propre à
 * chaque compte et commun à tous ses appareils — le localStorage d'avant
 * confondait les comptes d'un même navigateur et oubliait tout ailleurs.
 *
 * `seenAt` est aussi exposé pour que la galerie marque un à un les succès
 * plus récents que la dernière visite.
 */
const useAchievementsSeen = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const { unlockedAt } = useAchievements();
  const queryKey = ["achievements-seen", userId];

  const { data: seenAt, isPending } = useQuery<string>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("achievements_seen_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.achievements_seen_at ?? "";
    },
  });

  // Déblocage le plus récent ("" si aucun succès). Les dates viennent toutes de
  // Postgres au même format ISO UTC → comparaison lexicographique fiable.
  const latest = Object.values(unlockedAt).reduce<string>(
    (max, date) => (date && date > max ? date : max),
    ""
  );

  // Tant que la date « vue » n'est pas chargée, pas de pastille : mieux vaut
  // un léger retard qu'un clignotement à chaque ouverture.
  const ready = !!userId && !isPending;

  const markSeen = useCallback(async () => {
    // Pas avant d'avoir lu la valeur en base : sinon on écraserait la date
    // avant que la galerie ait pu repérer ce qui est nouveau.
    if (!ready || !latest) return;
    const current = queryClient.getQueryData<string>(queryKey) ?? "";
    if (latest <= current) return;
    // Optimiste : la pastille s'éteint tout de suite, la base suit.
    queryClient.setQueryData(queryKey, latest);
    await supabaseClient
      .from("profiles")
      .upsert({ id: userId, achievements_seen_at: latest });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, latest, queryClient]);
  const hasUnseen = ready && !!latest && latest > (seenAt ?? "");

  return { hasUnseen, markSeen, seenAt: ready ? (seenAt ?? "") : null };
};

export default useAchievementsSeen;

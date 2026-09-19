import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import useFeedback, { Feedback, lastMessage } from "./useFeedback";

/**
 * Puce « du nouveau sur mes demandes » : on compare la date du dernier geste
 * de l'admin — classement (`handled_at`, posé à chaque changement de statut)
 * ou message dans le fil — à ce que l'utilisateur a déjà vu. Stocké EN BASE
 * (`profiles.feedback_seen_at`), comme les succès et les nouveautés : propre à chaque compte et commun à tous ses
 * appareils — le localStorage d'avant confondait les comptes d'un même
 * navigateur et oubliait tout ailleurs.
 *
 * Le temps réel vient de `useFeedback` lui-même : son canal Realtime rafraîchit
 * la liste, donc la puce s'allume à la seconde où l'admin tranche.
 *
 * Une demande corrigée par son auteur repart en attente avec `handled_at` à
 * null : agir sur sa propre demande n'allume donc jamais la puce.
 *
 * `seenAt` est aussi exposé pour que la liste marque une à une les demandes
 * classées depuis la dernière visite.
 */
/**
 * Date du dernier geste de QUELQU'UN D'AUTRE sur une demande ("" si aucun) :
 * un classement, une suppression par l'admin, ou le dernier message du fil
 * s'il n'est pas de `me`. Mes propres messages n'allument jamais ma puce.
 */
export const feedbackTouchedAt = (item: Feedback, me: string | undefined) => {
  const last = lastMessage(item);
  return [
    item.handled_at ?? "",
    item.deleted_at ?? "",
    last && last.author_id !== me ? last.created_at : "",
  ].reduce((max, d) => (d > max ? d : max), "");
};

const useFeedbackSeen = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const { data: items = [] } = useFeedback("mine");
  const queryKey = ["feedback-seen", userId];

  const { data: seenAt, isPending } = useQuery<string>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("feedback_seen_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.feedback_seen_at ?? "";
    },
  });

  // Geste admin le plus récent ("" si aucun). Les dates viennent toutes de
  // Postgres au même format ISO UTC → comparaison lexicographique fiable.
  const latest = items.reduce((max, item) => {
    const at = feedbackTouchedAt(item, userId);
    return at > max ? at : max;
  }, "");

  // Tant que la date « vue » n'est pas chargée, pas de pastille : mieux vaut
  // un léger retard qu'un clignotement à chaque ouverture.
  const ready = !!userId && !isPending;

  const markSeen = useCallback(async () => {
    // Pas avant d'avoir lu la valeur en base : sinon on écraserait la date
    // avant que la liste ait pu repérer ce qui est nouveau.
    if (!ready || !latest) return;
    const current = queryClient.getQueryData<string>(queryKey) ?? "";
    if (latest <= current) return;
    // Optimiste : la pastille s'éteint tout de suite, la base suit.
    queryClient.setQueryData(queryKey, latest);
    await supabaseClient
      .from("profiles")
      .upsert({ id: userId, feedback_seen_at: latest });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, latest, queryClient]);
  const hasUnseen = ready && !!latest && latest > (seenAt ?? "");

  return { hasUnseen, markSeen, seenAt: ready ? (seenAt ?? "") : null };
};

export default useFeedbackSeen;

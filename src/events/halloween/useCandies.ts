import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "@/services/supabaseClient";
import useSession from "@/hooks/useSession";
import { grantVisitTrophy } from "@/hooks/useTrophies";
import { patchQueries, rollbackQueries, settleWhenIdle } from "@/lib/optimistic";
import { CANDIES_DB, CANDY_HUNT_YEAR, candyHuntOn } from "../candiesDb";
import { celebrate } from "./celebration";

/**
 * Chasse aux bonbons d'Halloween 2026 : quatre bonbons cachés sur le site ;
 * les trouver tous donne le trophée « Trick or Treat » (à part des
 * succès), décerné en base par un trigger. Une ligne par bonbon trouvé dans
 * `event_candies` (sql/2026-10-17_event_candies.sql). Hors 2026 : aucun
 * bonbon (`found` vide, rien n'est lu).
 */
export type CandyId = "papillote" | "sucette" | "menthe" | "mais";
export const CANDY_IDS: CandyId[] = ["papillote", "sucette", "menthe", "mais"];

const EVENT_ID = "halloween";
const TROPHY_ID = "halloween_2026_candies";

const MUTATION_KEY = ["event-candies", "find"];

/** Base débranchée (CANDIES_DB) : bonbons trouvés pendant la visite. */
const visitFound = new Set<CandyId>();

const useCandies = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["event-candies", userId, EVENT_ID, CANDY_HUNT_YEAR];
  const on = candyHuntOn();

  const { data: found = [], isPending } = useQuery<CandyId[], Error>({
    queryKey,
    enabled: !!userId && on,
    // Lecture en échec (table absente…) : les bonbons restent en place
    // plutôt que de rester cachés le temps des nouvelles tentatives, et on ne
    // relit pas à chaque composant qui s'y abonne ni à chaque retour sur
    // l'onglet. Seules nos prises changent la liste : elles la rechargent
    // elles-mêmes (invalidation).
    retry: false,
    retryOnMount: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!CANDIES_DB) return [...visitFound];
      const { data, error } = await supabaseClient
        .from("event_candies")
        .select("candy_id")
        .eq("user_id", userId)
        .eq("event_id", EVENT_ID)
        .eq("season", CANDY_HUNT_YEAR);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.candy_id as CandyId);
    },
  });

  // Optimiste : le bonbon est à soi dès le clic, le serveur suit.
  const { mutate } = useMutation({
    mutationKey: MUTATION_KEY,
    scope: { id: "event-candies" },
    mutationFn: async (candy: CandyId) => {
      if (!CANDIES_DB) {
        visitFound.add(candy);
        return;
      }
      const { error } = await supabaseClient.from("event_candies").insert({
        user_id: userId,
        event_id: EVENT_ID,
        season: CANDY_HUNT_YEAR,
        candy_id: candy,
      });
      // 23505 = déjà trouvé (autre onglet, autre appareil) : rien à faire.
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    onMutate: (candy) =>
      patchQueries(queryClient, [
        [queryKey, (prev: CandyId[]) => (prev.includes(candy) ? prev : [...prev, candy])],
      ]),
    onError: (_e, _candy, context) => rollbackQueries(queryClient, context),
    onSettled: () =>
      settleWhenIdle(queryClient, MUTATION_KEY, () => {
        queryClient.invalidateQueries({ queryKey: ["event-candies"] });
        // Trophée décerné par le trigger au 4e bonbon : profil à jour.
        queryClient.invalidateQueries({ queryKey: ["trophies"] });
      }),
  });

  const find = (candy: CandyId) => {
    if (!userId || !on || found.includes(candy)) return;
    // Le 4e : le trophée, et sa fenêtre après la prise du bonbon.
    if (CANDY_IDS.every((c) => c === candy || found.includes(c))) {
      if (!CANDIES_DB) grantVisitTrophy(userId, TROPHY_ID);
      celebrate();
    }
    mutate(candy);
  };

  return { found, loading: !!userId && on && isPending, find, on };
};

export default useCandies;

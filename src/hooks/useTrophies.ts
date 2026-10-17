import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { CANDIES_DB } from "@/events/candiesDb";
import { TROPHIES, TROPHIES_BY_ID, type Trophy, type TrophyId } from "@/data/trophies";

export type EarnedTrophy = { def: Trophy; earned_at: string };

/** Base débranchée (CANDIES_DB) : trophées gagnés pendant la visite. */
const visitTrophies: { user_id: string; trophy_id: TrophyId; earned_at: string }[] = [];

/** Trophée gagné pendant la visite, base débranchée (cf. CANDIES_DB). */
export const grantVisitTrophy = (userId: string, id: TrophyId) => {
  if (!visitTrophies.some((t) => t.user_id === userId && t.trophy_id === id))
    visitTrophies.push({ user_id: userId, trophy_id: id, earned_at: new Date().toISOString() });
};

/** Trophées d'une personne, dans l'ordre du catalogue. */
const useTrophies = (userId: string | null) => {
  const { sessionData } = useSession();
  return useQuery<EarnedTrophy[], Error>({
    queryKey: ["trophies", userId, sessionData?.user?.id],
    enabled: !!userId,
    queryFn: async () => {
      let rows: { trophy_id: string; earned_at: string }[];
      if (!CANDIES_DB) {
        rows = visitTrophies.filter((t) => t.user_id === userId);
      } else {
        const { data, error } = await supabaseClient
          .from("user_trophies")
          .select("trophy_id, earned_at")
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
        rows = data ?? [];
      }
      const mine = userId === sessionData?.user?.id;
      return rows
        .map((r) => ({ def: TROPHIES_BY_ID[r.trophy_id as TrophyId], earned_at: r.earned_at }))
        // Chez les autres : pas avant le début de son évènement.
        .filter((t) => t.def && (mine || Date.now() >= t.def.visibleFrom.getTime()))
        .sort((a, b) => TROPHIES.indexOf(a.def) - TROPHIES.indexOf(b.def));
    },
  });
};

export default useTrophies;

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import { isAfterLunch, parisDay } from "./useLunchToday";
import {
  addLunchPriceSkip,
  readLunchPriceSkips,
} from "../services/lunchPriceSkip";

/**
 * Fenêtre de rattrapage, en jours : on redemande le prix d'un déjeuner passé
 * tant qu'il tient dans cette fenêtre. Six jours et pas sept : au-delà, le nom
 * du jour affiché (« mardi ») redeviendrait ambigu, et un prix qu'on ne se
 * rappelle plus ne vaut rien.
 */
export const LUNCH_PRICE_WINDOW_DAYS = 6;

export interface UnpricedLunch {
  restaurantId: number;
  /** Jour du déjeuner, "AAAA-MM-JJ" (colonne `day`). */
  day: string;
}

/** "AAAA-MM-JJ" décalé de `days` jours. Calcul en UTC : pas de dérive d'heure
 *  d'été, la date de départ étant déjà celle de Paris. */
const shiftDay = (day: string, days: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Mes déjeuners récents dont je n'ai JAMAIS donné le prix, du plus récent au
 * plus ancien.
 *
 * La relance ne tient pas qu'à la journée en cours : on revient souvent sur le
 * site le lendemain, et c'est encore un bon moment pour chiffrer le déjeuner
 * de la veille (demande du user, 2026-10-01). D'où la fenêtre de
 * LUNCH_PRICE_WINDOW_DAYS jours au lieu du seul jour courant.
 *
 * Deux requêtes plutôt qu'une jointure : PostgREST ne sait pas exprimer « les
 * plans SANS ligne de prix du même utilisateur » sans vue dédiée, et les deux
 * lectures portent sur quelques lignes (mes midis d'une semaine).
 */
const useUnpricedLunches = (enabled = true) => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["unpriced-lunches", userId];

  const { data = [], isPending } = useQuery<UnpricedLunch[], Error>({
    queryKey,
    enabled: !!userId && enabled,
    queryFn: async () => {
      const today = parisDay();
      const { data: plans, error } = await supabaseClient
        .from("lunch_plans")
        .select("restaurant_id, day")
        .eq("user_id", userId as string)
        .gte("day", shiftDay(today, -LUNCH_PRICE_WINDOW_DAYS))
        .lte("day", today)
        .not("restaurant_id", "is", null)
        .order("day", { ascending: false });
      if (error) throw new Error(error.message);
      if (!plans?.length) return [];

      // Un même restaurant peut revenir plusieurs fois dans la semaine : on ne
      // garde que le déjeuner le plus récent, le seul dont on parlera.
      const latest = new Map<number, string>();
      for (const p of plans) {
        const id = p.restaurant_id as number;
        if (!latest.has(id)) latest.set(id, p.day as string);
      }

      const { data: priced, error: pricedError } = await supabaseClient
        .from("restaurant_prices")
        .select("restaurant_id")
        .eq("user_id", userId as string)
        .in("restaurant_id", [...latest.keys()]);
      if (pricedError) throw new Error(pricedError.message);

      // Les refus sont appliqués ICI, dans la donnée partagée : la page du
      // midi et la navbar lisent le même cache, elles ne peuvent pas diverger.
      const declared = new Set((priced ?? []).map((p) => p.restaurant_id as number));
      const refused = new Set(readLunchPriceSkips(userId));
      return [...latest.entries()]
        .filter(
          ([restaurantId]) =>
            !declared.has(restaurantId) && !refused.has(restaurantId)
        )
        .map(([restaurantId, day]) => ({ restaurantId, day }))
        .sort((a, b) => b.day.localeCompare(a.day));
    },
  });

  /**
   * « Pas celle-là. » Le refus est écrit pour les visites suivantes, puis
   * retiré du CACHE : la puce de la navbar est une autre instance de ce hook,
   * elle doit s'éteindre dans le même geste — et sans refaire les deux
   * requêtes. Redéclarer un déjeuner ici le lèvera (cf. useLunchToday).
   */
  const skip = useCallback(
    (restaurantId: number) => {
      addLunchPriceSkip(userId, restaurantId);
      queryClient.setQueryData<UnpricedLunch[]>(
        ["unpriced-lunches", userId],
        (prev) => (prev ?? []).filter((l) => l.restaurantId !== restaurantId)
      );
    },
    [userId, queryClient]
  );

  // Relances DUES maintenant : le midi du jour n'en est une qu'une fois le
  // déjeuner passé (avant 14 h, le repas n'a pas eu lieu) ; les jours
  // précédents le sont toujours. La règle vit ici et pas dans les composants,
  // pour que la puce de la navbar et le bloc de la page du midi s'allument
  // exactement ensemble.
  const today = parisDay();
  const due = data.filter((l) => l.day < today || isAfterLunch());

  return {
    lunches: due,
    /** Au moins un prix à réclamer : de quoi allumer une puce. */
    pending: due.length > 0,
    loading: isPending,
    skip,
  };
};

export default useUnpricedLunches;

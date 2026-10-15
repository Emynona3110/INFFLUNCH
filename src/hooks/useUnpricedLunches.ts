import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import { isAfterLunch, parisDay } from "./useLunchToday";
import {
  addLunchPriceSkip,
  readLunchPriceSkips,
} from "../services/lunchPriceSkip";

/** Combien de mes derniers midis on examine pour retrouver la relance en
 *  cours : elle n'a plus de date limite, mais une relance ignorée pendant
 *  des mois n'a pas besoin d'être retrouvée au-delà. */
const LOOKBACK = 60;

export interface UnpricedLunch {
  restaurantId: number;
  /** Jour du déjeuner, "AAAA-MM-JJ" (colonne `day`). */
  day: string;
}

interface Candidate extends UnpricedLunch {
  /** Ce midi a ouvert une relance : je n'avais pas encore chiffré ce
   *  restaurant au moment de le déclarer. */
  opens: boolean;
  /** Prix donné depuis : la relance est complétée. */
  priced: boolean;
  /** Relance fermée à la croix. */
  refused: boolean;
}

/**
 * LA relance de prix en cours (« combien as-tu payé ? »), s'il y en a une.
 *
 * Règle (demande du user, 2026-10-11) : une relance s'ouvre quand je déclare
 * un midi dans un restaurant que je n'ai pas encore chiffré, et elle reste
 * affichée — sans date limite — jusqu'à ce que :
 *   - je donne le prix (complétée),
 *   - je la ferme à la croix (refusée),
 *   - un midi plus récent ouvre une autre relance (remplacée).
 * Un midi dans un restaurant déjà chiffré n'ouvre rien : il ne remplace donc
 * pas la relance en cours. Une relance remplacée ne revient pas, même si la
 * suivante est refusée ou complétée.
 *
 * Deux requêtes plutôt qu'une jointure : PostgREST ne sait pas exprimer « le
 * prix déclaré AVANT ce midi » sans vue dédiée, et les deux lectures portent
 * sur quelques dizaines de lignes.
 */
const useUnpricedLunches = (enabled = true) => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["unpriced-lunches", userId];

  const { data = [], isPending } = useQuery<Candidate[], Error>({
    queryKey,
    // Badge de la navbar et invite de prix : les pages ne l'attendent pas (PageReveal).
    meta: { background: true },
    enabled: !!userId && enabled,
    queryFn: async () => {
      const { data: plans, error } = await supabaseClient
        .from("lunch_plans")
        .select("restaurant_id, day, created_at")
        .eq("user_id", userId as string)
        .lte("day", parisDay())
        .not("restaurant_id", "is", null)
        .order("day", { ascending: false })
        .limit(LOOKBACK);
      if (error) throw new Error(error.message);
      if (!plans?.length) return [];

      const ids = [...new Set(plans.map((p) => p.restaurant_id as number))];
      const { data: prices, error: pricesError } = await supabaseClient
        .from("restaurant_prices")
        .select("restaurant_id, created_at")
        .eq("user_id", userId as string)
        .in("restaurant_id", ids);
      if (pricesError) throw new Error(pricesError.message);

      // Date de MA déclaration de prix, par restaurant (une ligne par resto).
      const pricedAt = new Map(
        (prices ?? []).map((p) => [p.restaurant_id as number, p.created_at as string])
      );
      const refused = new Set(readLunchPriceSkips(userId));
      return plans.map((p) => {
        const restaurantId = p.restaurant_id as number;
        const at = pricedAt.get(restaurantId);
        return {
          restaurantId,
          day: p.day as string,
          opens: !at || at > (p.created_at as string),
          priced: !!at,
          refused: refused.has(restaurantId),
        };
      });
    },
  });

  /**
   * « Pas celle-là. » Le refus est écrit pour les visites suivantes, puis
   * reporté dans le CACHE : la puce de la navbar est une autre instance de ce
   * hook, elle doit s'éteindre dans le même geste — et sans refaire les deux
   * requêtes. Redéclarer un déjeuner ici le lèvera (cf. useLunchToday).
   */
  const skip = useCallback(
    (restaurantId: number) => {
      addLunchPriceSkip(userId, restaurantId);
      queryClient.setQueryData<Candidate[]>(["unpriced-lunches", userId], (prev) =>
        (prev ?? []).map((c) =>
          c.restaurantId === restaurantId ? { ...c, refused: true } : c
        )
      );
    },
    [userId, queryClient]
  );

  // Le midi du jour n'ouvre sa relance qu'une fois le déjeuner passé (avant
  // 14 h, le repas n'a pas eu lieu) : d'ici là, il ne remplace pas non plus
  // celle de la veille. La règle vit ici et pas dans les composants, pour que
  // la puce de la navbar et le bloc de la page du midi s'allument ensemble.
  const today = parisDay();
  const current = data.find(
    (c) => c.opens && (c.day < today || isAfterLunch())
  );
  const lunches: UnpricedLunch[] =
    current && !current.priced && !current.refused
      ? [{ restaurantId: current.restaurantId, day: current.day }]
      : [];

  return {
    lunches,
    /** Un prix à réclamer : de quoi allumer une puce. */
    pending: lunches.length > 0,
    loading: isPending,
    skip,
  };
};

export default useUnpricedLunches;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import { patchQueries, rollbackQueries, settleWhenIdle } from "../lib/optimistic";

/** Ce qu'une personne déclare dépenser dans un restaurant, au centime près. */
export interface PriceReport {
  min: number;
  max: number;
}

/**
 * Ma déclaration de prix pour un restaurant, une seule par personne et par
 * resto, modifiable. Les fourchettes affichées, elles, sont des agrégats
 * (médianes) maintenus par trigger sur `restaurants` : écrire ici suffit, il ne
 * reste qu'à invalider la liste des restaurants pour les relire.
 * La RLS ne laisse de toute façon voir que sa propre déclaration.
 */
const useMyPriceReport = (restaurantId: number | undefined) => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["price-report", restaurantId, userId];

  const { data: report = null, isPending } = useQuery<PriceReport | null, Error>({
    queryKey,
    enabled: !!restaurantId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("restaurant_prices")
        .select("amount_min, amount_max")
        .eq("restaurant_id", restaurantId as number)
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data
        ? { min: Number(data.amount_min), max: Number(data.amount_max) }
        : null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    // Paliers « L'addition ! » / « Gardez la monnaie » : comptés en base, donc
    // relus tout de suite pour que le succès tombe dans la foulée.
    queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
    // Relances de prix de la page du midi : ce resto n'en fait plus partie.
    queryClient.invalidateQueries({ queryKey: ["unpriced-lunches"] });
  };

  // Écritures optimistes (src/lib/optimistic.ts) : ma déclaration et la
  // relance du midi changent au clic. Les fourchettes du resto, calculées en
  // base, suivent au rechargement.
  const writeKey = ["price-report-write", restaurantId];
  const writes = {
    mutationKey: writeKey,
    scope: { id: `price-report-write-${restaurantId}` },
    onError: (_e: Error, _v: unknown, context?: Awaited<ReturnType<typeof patchQueries>>) =>
      rollbackQueries(queryClient, context),
    onSettled: () => settleWhenIdle(queryClient, writeKey, invalidate),
  };

  const saveMutation = useMutation({
    ...writes,
    onMutate: ({ min, max }: PriceReport) =>
      patchQueries(queryClient, [
        [queryKey, () => ({ min, max })],
        // La relance de ce restaurant est complétée : elle s'efface tout de
        // suite (même champ que celui calculé par useUnpricedLunches).
        [
          ["unpriced-lunches", userId],
          (prev: { restaurantId: number; priced: boolean }[]) =>
            prev.map((l) =>
              l.restaurantId === restaurantId ? { ...l, priced: true } : l
            ),
        ],
      ]),
    mutationFn: async ({ min, max }: PriceReport) => {
      const { error } = await supabaseClient.from("restaurant_prices").upsert(
        {
          restaurant_id: restaurantId as number,
          user_id: userId as string,
          amount_min: min,
          amount_max: max,
        },
        { onConflict: "restaurant_id,user_id" },
      );
      if (error) throw new Error(error.message);
    },
  });

  const removeMutation = useMutation({
    ...writes,
    onMutate: () => patchQueries(queryClient, [[queryKey, () => null]]),
    mutationFn: async () => {
      const { error } = await supabaseClient
        .from("restaurant_prices")
        .delete()
        .match({ restaurant_id: restaurantId, user_id: userId });
      if (error) throw new Error(error.message);
    },
  });

  return {
    report,
    loading: isPending,
    save: saveMutation.mutateAsync,
    remove: () => removeMutation.mutateAsync(undefined),
    saving: saveMutation.isPending || removeMutation.isPending,
  };
};

export default useMyPriceReport;

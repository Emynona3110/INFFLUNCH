import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";

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
  };

  const saveMutation = useMutation({
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
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseClient
        .from("restaurant_prices")
        .delete()
        .match({ restaurant_id: restaurantId, user_id: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    report,
    loading: isPending,
    save: saveMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    saving: saveMutation.isPending || removeMutation.isPending,
  };
};

export default useMyPriceReport;

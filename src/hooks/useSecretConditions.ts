import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { AchievementId } from "@/data/achievements";

/**
 * Conditions des succès SECRETS, lues en base (`achievement_secrets`) : la RLS
 * ne renvoie que celles des succès déjà débloqués par l'utilisateur. Rien dans
 * le bundle → rien à lire dans le code du navigateur avant de les mériter.
 */
const useSecretConditions = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;

  const { data } = useQuery({
    queryKey: ["achievement-secrets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("achievement_secrets")
        .select("id, condition");
      if (error) throw new Error(error.message);
      return Object.fromEntries(
        (data ?? []).map((r) => [r.id, r.condition])
      ) as Partial<Record<AchievementId, string>>;
    },
  });

  return data ?? {};
};

export default useSecretConditions;

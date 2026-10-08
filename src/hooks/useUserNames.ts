import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { authorTrigram, formatAuthorName } from "@/utils/authorName";

interface UserName {
  email: string;
  display_name: string | null;
  trigram: string | null;
}

export const USER_NAMES_KEY = "user-names";

/**
 * Nom affiché et trigramme de chaque utilisateur (public.users, modifiables
 * par un admin — sql/2026-10-08_noms_trigrammes.sql). Une seule requête pour
 * toute l'appli (~100 lignes), indexée par email : les données des avis,
 * photos, tablées… portent déjà l'email de l'auteur.
 *
 * Repli sur le calcul depuis l'email tant que la liste n'est pas chargée, ou
 * pour un compte supprimé (« Ancien collaborateur »).
 */
const useUserNames = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;

  const { data } = useQuery<UserName[], Error>({
    // Clé liée au compte : une liste vide lue hors connexion (RLS) ne doit
    // pas rester en cache après le login.
    queryKey: [USER_NAMES_KEY, userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("users")
        .select("email, display_name, trigram");
      if (error) throw new Error(error.message);
      return (data ?? []) as UserName[];
    },
  });

  const byEmail = useMemo(
    () => new Map((data ?? []).map((u) => [u.email?.toLowerCase(), u])),
    [data]
  );

  const nameOf = useCallback(
    (email: string | null | undefined) =>
      (email && byEmail.get(email.toLowerCase())?.display_name) ||
      formatAuthorName(email),
    [byEmail]
  );

  const trigramOf = useCallback(
    (email: string | null | undefined) =>
      (email && byEmail.get(email.toLowerCase())?.trigram) ||
      authorTrigram(email),
    [byEmail]
  );

  return { nameOf, trigramOf };
};

export default useUserNames;

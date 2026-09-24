import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useIsAdmin from "./useIsAdmin";
import useRealtimeTable from "./useRealtimeTable";

export interface AppUser {
  id: string;
  email: string;
  role: string;
  /** Date d'inscription (auth.users.created_at, ISO). */
  created_at: string;
}

/**
 * Liste des utilisateurs, triés par email. Sert à la table admin et au sélecteur
 * d'auteur (attribuer une photo au nom d'un autre collaborateur) — les deux sont
 * réservés aux admins.
 *
 * Passe par la rpc `admin_users` (sql/2026-09-25_admin_users.sql) et non par un
 * select sur `users` : la date d'inscription vit dans auth.users, hors de portée
 * du client. La fonction ne rend rien à un non-admin.
 */
const useUsers = (enabled = true) => {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  // Temps réel : un compte créé (acceptation d'une demande), supprimé, ou dont
  // le rôle change rafraîchit la table sans recharger la page. La rpc relit
  // auth.users, mais les mouvements passent tous par public.users (trigger à
  // l'inscription, cascade à la suppression), c'est donc elle qu'on écoute.
  useRealtimeTable(
    "users",
    () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    enabled && isAdmin
  );

  return useQuery<AppUser[], Error>({
    queryKey: ["users"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_users");
      if (error) throw new Error(error.message);
      return (data ?? []) as AppUser[];
    },
  });
};

export default useUsers;

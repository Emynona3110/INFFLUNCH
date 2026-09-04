import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useIsAdmin from "./useIsAdmin";
import useRealtimeTable from "./useRealtimeTable";

export type RequestType = "creation" | "password_reset";
export type RequestState = "Waiting" | "Accepted" | "Rejected";

export interface AccessRequest {
  id: number;
  email: string;
  type: RequestType;
  state: RequestState;
  created_at: string;
}

/** Types de demandes (ordre = ordre des onglets). Ajouter ici pour en gérer d'autres. */
export const requestTypes: { type: RequestType; label: string }[] = [
  { type: "creation", label: "Inscription" },
  { type: "password_reset", label: "Mot de passe" },
];

export const requestTypeLabel: Record<RequestType, string> = Object.fromEntries(
  requestTypes.map((t) => [t.type, t.label])
) as Record<RequestType, string>;

/**
 * Liste des demandes d'accès (waiting_list). Lecture réservée aux admins (RLS) :
 * la requête n'est activée que pour eux. Cache partagé via la clé
 * ["access-requests"] entre la navbar (puce) et la section Demandes.
 */
const useAccessRequests = () => {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  // Sync temps réel : à chaque changement sur waiting_list (nouvelle demande,
  // accept/reject…), on invalide la query → table ET puce navbar se rafraîchissent
  // sans recharger la page. Admins uniquement (la table est en lecture admin-only).
  useRealtimeTable(
    "waiting_list",
    () => queryClient.invalidateQueries({ queryKey: ["access-requests"] }),
    isAdmin
  );

  return useQuery<AccessRequest[], Error>({
    queryKey: ["access-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("waiting_list")
        .select("id, email, type, state, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AccessRequest[];
    },
  });
};

export default useAccessRequests;

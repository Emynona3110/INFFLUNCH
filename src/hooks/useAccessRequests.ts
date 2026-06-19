import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useIsAdmin from "./useIsAdmin";

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
  // sans recharger la page. Nom de canal unique pour cohabiter avec les autres
  // instances du hook (navbar + section). Admins uniquement.
  // ⚠️ Nécessite que la table soit dans la publication realtime (cf.
  // sql/2026-06-19_waiting_list_realtime.sql).
  useEffect(() => {
    if (!isAdmin) return;
    let channel: ReturnType<typeof supabaseClient.channel> | null = null;
    let cancelled = false;

    (async () => {
      // La table est protégée par RLS (lecture admin-only) : il faut passer le
      // JWT utilisateur à la connexion Realtime, sinon elle reste "anon" et le
      // serveur ne délivre aucun événement.
      const { data } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      await supabaseClient.realtime.setAuth(data.session?.access_token ?? null);

      channel = supabaseClient
        .channel(`waiting_list-rt-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "waiting_list" },
          () =>
            queryClient.invalidateQueries({ queryKey: ["access-requests"] })
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[realtime waiting_list] statut:", status);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

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

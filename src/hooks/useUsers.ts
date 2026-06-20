import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";

export interface AppUser {
  id: string;
  email: string;
}

/**
 * Liste des utilisateurs (id + email), triés par email. Sert au sélecteur
 * d'auteur côté admin (attribuer une photo au nom d'un autre collaborateur).
 * Lecture réservée aux admins côté UI ; la RLS users autorise déjà la lecture.
 */
const useUsers = (enabled = true) =>
  useQuery<AppUser[], Error>({
    queryKey: ["users"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("users")
        .select("id, email")
        .order("email", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AppUser[];
    },
  });

export default useUsers;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { FeedbackStatus, FeedbackType } from "../services/feedbackTypes";
import useSession from "./useSession";

export interface Feedback {
  id: number;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  /** Note de backlog créée à l'acceptation, pour la mettre à jour ensuite. */
  note_id: number | null;
  author_id: string;
  created_at: string;
  handled_at: string | null;
  /** Email de l'auteur (jointure manuelle) : seuls les admins en ont besoin. */
  email?: string | null;
}

/**
 * Demandes des collaborateurs sur l'appli (`feedback`).
 *
 * `scope` ne fait que restreindre la requête : c'est la RLS qui décide vraiment
 * de ce qui revient — chacun ses lignes, tout pour les admins.
 *   - "mine"  : l'onglet « Demandes » de Mon compte ;
 *   - "admin" : la boîte de réception, avec l'email de l'auteur.
 */
const useFeedback = (scope: "mine" | "admin" = "mine", enabled = true) => {
  const queryClient = useQueryClient();
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const key = ["feedback", scope];

  const query = useQuery<Feedback[], Error>({
    queryKey: key,
    enabled: enabled && (scope === "admin" || !!userId),
    queryFn: async () => {
      let request = supabaseClient
        .from("feedback")
        .select("id, type, message, status, note_id, author_id, created_at, handled_at")
        .order("created_at", { ascending: false });
      if (scope === "mine") request = request.eq("author_id", userId as string);

      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Feedback[];
      if (scope === "mine" || rows.length === 0) return rows;

      // Comme reviews et photos : pas de FK vers public.users, on rapporte les
      // emails en une requête plutôt qu'une par ligne.
      const ids = [...new Set(rows.map((r) => r.author_id))];
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, email")
        .in("id", ids);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string])
      );
      return rows.map((r) => ({ ...r, email: emailById[r.author_id] ?? null }));
    },
  });

  // Les deux vues lisent la même table : on invalide les deux clés.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["feedback"] });
  };

  const submit = useMutation({
    mutationFn: async (values: { type: FeedbackType; message: string }) => {
      const { error } = await supabaseClient.from("feedback").insert(values);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Correction par l'auteur. Le trigger en base remet la demande en attente :
   *  inutile (et impossible) de toucher au statut d'ici. */
  const edit = useMutation({
    mutationFn: async ({
      id,
      ...values
    }: {
      id: number;
      type: FeedbackType;
      message: string;
    }) => {
      const { error } = await supabaseClient
        .from("feedback")
        .update(values)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Classement par l'admin. `note_id` accompagne le statut : posé en acceptant,
   *  remis à null en refusant (la note quitte alors le carnet). */
  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      note_id,
    }: {
      id: number;
      status: FeedbackStatus;
      note_id?: number | null;
    }) => {
      const { error } = await supabaseClient
        .from("feedback")
        .update(note_id === undefined ? { status } : { status, note_id })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabaseClient.from("feedback").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { ...query, submit, edit, setStatus, remove };
};

export default useFeedback;

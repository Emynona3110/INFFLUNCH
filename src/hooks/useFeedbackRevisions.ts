import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { FeedbackType } from "../services/feedbackTypes";

export interface FeedbackRevision {
  id: number;
  version: number;
  type: FeedbackType;
  message: string;
  /** Date à laquelle cette version a cédé la place à la suivante. */
  replaced_at: string;
}

/**
 * Versions REMPLACÉES d'une demande (`feedback_revisions`), de la plus récente
 * à la plus ancienne. La version courante n'est pas là : elle vit dans
 * `feedback` — l'historique complet, c'est celle-ci plus ces lignes.
 *
 * Chargé à l'ouverture de la popup seulement : inutile de tirer l'historique de
 * toutes les demandes pour afficher la liste.
 */
const useFeedbackRevisions = (feedbackId: number | null) =>
  useQuery<FeedbackRevision[], Error>({
    queryKey: ["feedback-revisions", feedbackId],
    enabled: feedbackId !== null,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("feedback_revisions")
        .select("id, version, type, message, replaced_at")
        .eq("feedback_id", feedbackId as number)
        .order("version", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as FeedbackRevision[];
    },
  });

export default useFeedbackRevisions;

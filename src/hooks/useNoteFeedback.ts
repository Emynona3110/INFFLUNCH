import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";

interface NoteFeedback {
  id: number;
  edits: number;
}

/**
 * Demande à l'origine d'une note du carnet, s'il y en a une : le lien est porté
 * par `feedback.note_id`, on remonte donc à l'envers. Sert à montrer, dans la
 * popup de la note, l'historique de la demande dont elle est issue — une note
 * écrite à la main par un admin n'en a évidemment aucun.
 */
const useNoteFeedback = (noteId: number | null) =>
  useQuery<NoteFeedback | null, Error>({
    queryKey: ["note-feedback", noteId],
    enabled: noteId !== null && noteId > 0,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("feedback")
        .select("id, edits")
        .eq("note_id", noteId as number)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as NoteFeedback | null) ?? null;
    },
  });

export default useNoteFeedback;

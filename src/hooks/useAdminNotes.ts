import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { NoteCategory } from "../services/noteCategories";

export interface AdminNote {
  id: number;
  description: string;
  category: NoteCategory;
  position: number;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

const KEY = ["admin-notes"];

/** En cours d'abord, puis dans l'ordre choisi à la souris (miroir de l'index). */
const sortNotes = (notes: AdminNote[]) =>
  [...notes].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.position - b.position
  );

/** Contexte rendu par onMutate : la liste d'avant, pour rembobiner en cas
 *  d'échec serveur. */
interface Rollback {
  previous?: AdminNote[];
}

/**
 * Carnet de backlog des admins (`admin_notes`). La RLS ne laisse passer que les
 * admins : `enabled` sert à ne pas déclencher une requête vouée à revenir vide
 * pour les autres.
 *
 * Toutes les écritures sont optimistes : la liste affichée change tout de suite
 * et n'attend pas le serveur — c'est un carnet qu'on remplit à la volée. Si
 * l'écriture échoue, on remet la liste telle qu'elle était (et l'appelant
 * affiche l'erreur).
 */
const useAdminNotes = (enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery<AdminNote[], Error>({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("admin_notes")
        .select("id, description, category, position, done, done_at, created_at")
        .order("done", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminNote[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
  };

  /** Lignes réellement en base : la note fraîchement ajoutée porte un id
   *  temporaire négatif tant que l'insert n'est pas revenu. */
  const persisted = () =>
    (queryClient.getQueryData<AdminNote[]>(KEY) ?? []).filter((n) => n.id > 0);

  /** Position d'une nouvelle note : en fin de liste des notes en cours. */
  const nextPosition = (notes: AdminNote[]) => {
    const last = notes.filter((n) => !n.done).at(-1);
    return last ? last.position + 1 : 0;
  };

  /** Options communes : appliquer dans le cache, défaire si le serveur refuse,
   *  puis resynchroniser dans tous les cas. */
  const optimistic = <V,>(apply: (notes: AdminNote[], vars: V) => AdminNote[]) => ({
    onMutate: async (vars: V): Promise<Rollback> => {
      // Écrit dans le cache AVANT le moindre `await` : l'affichage se met à
      // jour dans la foulée de l'action, sans attendre un tour de boucle.
      const previous = queryClient.getQueryData<AdminNote[]>(KEY);
      if (previous) {
        queryClient.setQueryData(KEY, sortNotes(apply(previous, vars)));
      }
      await queryClient.cancelQueries({ queryKey: KEY });
      return { previous };
    },
    onError: (_error: Error, _vars: V, context: Rollback | undefined) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: invalidate,
  });

  // Renvoie l'id réel de la note : l'écran des demandes le retient pour pouvoir
  // mettre à jour cette note-là plus tard plutôt que d'en créer une deuxième.
  const add = useMutation<number, Error, { description: string; category: NoteCategory }, Rollback>({
    mutationFn: async (note) => {
      const { data, error } = await supabaseClient
        .from("admin_notes")
        .insert({ ...note, position: nextPosition(persisted()) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as number;
    },
    ...optimistic((notes, vars: { description: string; category: NoteCategory }) => [
      ...notes,
      {
        // id négatif : provisoire, remplacé par la ligne réelle au refetch.
        id: -Date.now(),
        ...vars,
        position: nextPosition(notes),
        done: false,
        done_at: null,
        created_at: new Date().toISOString(),
      },
    ]),
  });

  const update = useMutation<
    void,
    Error,
    { id: number; description: string; category: NoteCategory },
    Rollback
  >({
    mutationFn: async ({ id, ...fields }) => {
      const { error } = await supabaseClient
        .from("admin_notes")
        .update(fields)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    ...optimistic((notes, { id, ...fields }) =>
      notes.map((n) => (n.id === id ? { ...n, ...fields } : n))
    ),
  });

  // `done_at` est posé par le trigger en base, on n'écrit que la case cochée ;
  // côté cache on l'anticipe pour que la popup de lecture soit juste.
  const toggleDone = useMutation<void, Error, { id: number; done: boolean }, Rollback>({
    mutationFn: async ({ id, done }) => {
      const { error } = await supabaseClient
        .from("admin_notes")
        .update({ done })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    ...optimistic((notes, { id, done }) =>
      notes.map((n) =>
        n.id === id
          ? { ...n, done, done_at: done ? new Date().toISOString() : null }
          : n
      )
    ),
  });

  /** Déplacement à la souris : une seule ligne écrite, la position calculée
   *  entre les deux voisines d'arrivée. */
  const move = useMutation<void, Error, { id: number; position: number }, Rollback>({
    mutationFn: async ({ id, position }) => {
      const { error } = await supabaseClient
        .from("admin_notes")
        .update({ position })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    ...optimistic((notes, { id, position }) =>
      notes.map((n) => (n.id === id ? { ...n, position } : n))
    ),
  });

  const remove = useMutation<void, Error, number, Rollback>({
    mutationFn: async (id) => {
      const { error } = await supabaseClient
        .from("admin_notes")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    ...optimistic((notes, id: number) => notes.filter((n) => n.id !== id)),
  });

  return { ...query, add, update, toggleDone, move, remove };
};

export default useAdminNotes;

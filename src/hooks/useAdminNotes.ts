import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { NoteCategory } from "../services/noteCategories";
import useSession from "./useSession";

export interface AdminNote {
  id: number;
  description: string;
  category: NoteCategory;
  position: number;
  done: boolean;
  done_at: string | null;
  /** À l'origine de la note : l'admin qui l'a écrite, ou — quand elle vient
   *  d'une demande acceptée — le collaborateur qui l'a envoyée. */
  author_id: string | null;
  created_at: string;
  /** Email de l'auteur (jointure manuelle, pas de FK vers public.users). */
  email?: string | null;
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
  const { sessionData } = useSession();
  const me = sessionData?.user;

  const query = useQuery<AdminNote[], Error>({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("admin_notes")
        .select(
          "id, description, category, position, done, done_at, author_id, created_at"
        )
        .order("done", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as AdminNote[];

      // Comme les demandes : pas de FK vers public.users, on rapporte les
      // emails en une requête plutôt qu'une par ligne.
      const ids = [...new Set(rows.map((n) => n.author_id).filter(Boolean))];
      if (ids.length === 0) return rows;
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, email")
        .in("id", ids as string[]);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string])
      );
      return rows.map((n) => ({
        ...n,
        email: n.author_id ? emailById[n.author_id] ?? null : null,
      }));
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
  };

  /** La liste telle qu'elle est affichée, notes optimistes comprises : deux
   *  ajouts coup sur coup doivent recevoir deux positions distinctes, même si
   *  le premier insert n'est pas encore revenu. */
  const cached = () => queryClient.getQueryData<AdminNote[]>(KEY) ?? [];

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
  // `author_id` n'est passé que pour une note née d'une demande acceptée : elle
  // garde alors le collaborateur à l'origine, pas l'admin qui l'a reprise. Sans
  // lui, la base pose `auth.uid()` — celui qui écrit dans le carnet.
  type NewNote = {
    description: string;
    category: NoteCategory;
    author_id?: string;
    /** Email de cet auteur, pour l'affichage optimiste seulement. */
    email?: string | null;
  };

  const add = useMutation<number, Error, NewNote, Rollback>({
    mutationFn: async ({ description, category, author_id }) => {
      const { data, error } = await supabaseClient
        .from("admin_notes")
        .insert({
          description,
          category,
          position: nextPosition(cached()),
          ...(author_id ? { author_id } : {}),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as number;
    },
    ...optimistic((notes, vars: NewNote) => [
      ...notes,
      {
        // id négatif : provisoire, remplacé par la ligne réelle au refetch.
        id: -Date.now(),
        description: vars.description,
        category: vars.category,
        position: nextPosition(notes),
        done: false,
        done_at: null,
        author_id: vars.author_id ?? me?.id ?? null,
        email: vars.author_id ? vars.email ?? null : me?.email ?? null,
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
  //
  // Rouvrir une note la renvoie en FIN de liste des notes en cours, comme un
  // ajout : elle repart d'une place où on la retrouve, quitte à la remonter à
  // la souris — plutôt que de ressurgir au milieu, à sa position d'origine.
  const toggleDone = useMutation<void, Error, { id: number; done: boolean }, Rollback>({
    mutationFn: async ({ id, done }) => {
      const { error } = await supabaseClient
        .from("admin_notes")
        .update(
          done
            ? { done }
            : {
                done,
                // Le cache porte déjà la note rouverte : on l'écarte du calcul.
                position: nextPosition(cached().filter((n) => n.id !== id)),
              }
        )
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    // Le trigger en base termine (ou rouvre) la demande d'origine : la boîte de
    // réception des demandes doit être relue.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    ...optimistic((notes, { id, done }) => {
      const reopenedAt = done
        ? null
        : nextPosition(notes.filter((n) => n.id !== id));
      return notes.map((n) =>
        n.id === id
          ? {
              ...n,
              done,
              done_at: done ? new Date().toISOString() : null,
              position: reopenedAt ?? n.position,
            }
          : n
      );
    }),
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

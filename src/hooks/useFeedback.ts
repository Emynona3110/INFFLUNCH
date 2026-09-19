import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import {
  FeedbackStatus,
  FeedbackType,
  isFeedbackFrozen,
} from "../services/feedbackTypes";
import { removeFromBucket } from "../services/uploadImage";
import { FEEDBACK_BUCKET } from "../services/storagePaths";
import useRealtimeTable from "./useRealtimeTable";
import useSession from "./useSession";

/** Un message du fil d'une demande : de l'admin ou de l'auteur, immuable. */
export interface FeedbackMessage {
  id: number;
  feedback_id: number;
  author_id: string;
  body: string;
  created_at: string;
  /** Dernière retouche du texte par son auteur, null si jamais corrigé. */
  edited_at: string | null;
  /** Email et pp de l'auteur du message (jointure manuelle) : le fil nomme
   *  chacun, côté admin comme côté auteur. */
  email: string | null;
  avatar_path: string | null;
}

export interface Feedback {
  id: number;
  type: FeedbackType;
  message: string;
  /** Chemins (bucket `feedback-images`) des images jointes, 3 au plus, dans
   *  l'ordre choisi par l'auteur. */
  images: string[];
  status: FeedbackStatus;
  /** Note de backlog créée à l'acceptation, pour la mettre à jour ensuite. */
  note_id: number | null;
  author_id: string;
  created_at: string;
  handled_at: string | null;
  /** L'auteur s'est retiré : la demande sort de sa liste, mais l'admin la garde
   *  (et le backlog qu'elle a produit continue sa vie). */
  cancelled_at: string | null;
  /** L'admin l'a supprimée : elle quitte la boîte de réception, l'auteur garde
   *  sa tuile grisée (figée, en lecture). */
  deleted_at: string | null;
  /** Versions archivées (historique : depuis le 2026-09-19 une demande ne se
   *  corrige plus que tant qu'elle est en attente, en place — le fil sert à
   *  préciser ensuite). */
  edits: number;
  /** Date de la dernière correction, null si la demande n'a jamais bougé. */
  updated_at: string | null;
  /** Email de l'auteur (jointure manuelle) : seuls les admins en ont besoin. */
  email?: string | null;
  /** Fil de discussion sous la demande, du plus ancien au plus récent. */
  messages: FeedbackMessage[];
}

/** Dernier message du fil, s'il y en a un. */
export const lastMessage = (item: Feedback): FeedbackMessage | undefined =>
  item.messages[item.messages.length - 1];

/**
 * La balle est chez l'admin : demande pas encore classée, ou fil dont le
 * dernier mot est à l'auteur (sous une acceptée, par exemple) tant qu'elle
 * n'est pas figée. Sert la puce de l'onglet Admin et la mise en avant des
 * lignes de la boîte de réception.
 */
export const awaitingAdmin = (item: Feedback) =>
  item.status === "nouveau" ||
  (!isFeedbackFrozen(item.status) &&
    lastMessage(item)?.author_id === item.author_id);

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
  const active = enabled && (scope === "admin" || !!userId);

  const query = useQuery<Feedback[], Error>({
    queryKey: key,
    enabled: active,
    queryFn: async () => {
      let request = supabaseClient
        .from("feedback")
        .select(
          "id, type, message, images, status, note_id, author_id, created_at, handled_at, cancelled_at, deleted_at, edits, updated_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      // L'auteur ne revoit pas ce qu'il a retiré ; l'admin, si. L'admin ne
      // revoit pas ce qu'il a supprimé ; l'auteur, si (tuile grisée).
      if (scope === "mine") {
        request = request
          .eq("author_id", userId as string)
          .is("cancelled_at", null);
      } else {
        request = request.is("deleted_at", null);
      }

      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const base = (data ?? []) as Omit<Feedback, "messages">[];
      if (base.length === 0) return [];

      // Le fil de chaque demande, en une requête pour toutes : la RLS ne rend
      // que ce que la demande elle-même laisse lire.
      const { data: msgs, error: msgsError } = await supabaseClient
        .from("feedback_messages")
        .select("id, feedback_id, author_id, body, created_at, edited_at")
        .in(
          "feedback_id",
          base.map((r) => r.id),
        )
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (msgsError) throw new Error(msgsError.message);
      const byFeedback = new Map<number, FeedbackMessage[]>();
      for (const m of (msgs ?? []) as FeedbackMessage[]) {
        const list = byFeedback.get(m.feedback_id) ?? [];
        list.push(m);
        byFeedback.set(m.feedback_id, list);
      }
      const rows: Feedback[] = base.map((r) => ({
        ...r,
        messages: byFeedback.get(r.id) ?? [],
      }));

      // Comme reviews et photos : pas de FK vers public.users, on rapporte
      // emails et pp en deux requêtes plutôt qu'une par ligne — auteurs des
      // demandes (admin seulement) et des messages (tout le monde : le fil
      // nomme chacun) confondus.
      const ids = [
        ...new Set([
          ...(scope === "admin" ? rows.map((r) => r.author_id) : []),
          ...rows.flatMap((r) => r.messages.map((m) => m.author_id)),
        ]),
      ];
      if (ids.length === 0) return rows;
      const [{ data: users }, { data: profiles }] = await Promise.all([
        supabaseClient.from("users").select("id, email").in("id", ids),
        supabaseClient.from("profiles").select("id, avatar_path").in("id", ids),
      ]);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string]),
      );
      const avatarById = Object.fromEntries(
        (profiles ?? []).map((p) => [
          p.id as string,
          p.avatar_path as string | null,
        ]),
      );
      return rows.map((r) => ({
        ...r,
        // Sur ses propres demandes, l'auteur n'a pas à se voir nommer.
        ...(scope === "admin" && { email: emailById[r.author_id] ?? null }),
        messages: r.messages.map((m) => ({
          ...m,
          email: emailById[m.author_id] ?? null,
          avatar_path: avatarById[m.author_id] ?? null,
        })),
      }));
    },
  });

  // Les deux vues lisent la même table : on invalide les deux clés.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["feedback"] });
  };

  // Sync temps réel : une demande envoyée par un collègue apparaît tout de
  // suite dans la boîte de réception admin (et sa puce), et l'auteur voit son
  // classement sans recharger. La RLS filtre déjà ce que chacun reçoit.
  useRealtimeTable("feedback", invalidate, active);
  // Le fil vit dans sa propre table : un message de l'admin apparaît chez
  // l'auteur (et allume sa puce) sans recharger, et réciproquement.
  useRealtimeTable("feedback_messages", invalidate, active);

  const submit = useMutation({
    mutationFn: async (values: {
      type: FeedbackType;
      message: string;
      images: string[];
    }) => {
      const { error } = await supabaseClient.from("feedback").insert(values);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Correction par l'auteur, possible tant que la demande est en attente
   *  (retouche en place, le trigger fige le reste). Les images retirées
   *  partent du bucket. */
  const edit = useMutation({
    mutationFn: async ({
      item,
      ...values
    }: {
      item: Feedback;
      type: FeedbackType;
      message: string;
      images: string[];
    }) => {
      const { error } = await supabaseClient
        .from("feedback")
        .update(values)
        .eq("id", item.id);
      if (error) throw new Error(error.message);
      const dropped = item.images.filter((p) => !values.images.includes(p));
      await removeFromBucket(dropped, FEEDBACK_BUCKET).catch(() => {});
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

  /** Un message de plus dans le fil, en son nom (admin partout, auteur sous
   *  ses propres demandes — la RLS tranche). Immuable : c'est l'historique. */
  const reply = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => {
      const { error } = await supabaseClient
        .from("feedback_messages")
        .insert({ feedback_id: id, author_id: userId, body: body.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Corriger SON message dans le fil (la RLS n'autorise que l'auteur). */
  const editMessage = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => {
      const { error } = await supabaseClient
        .from("feedback_messages")
        .update({ body: body.trim() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /**
   * « Supprimer », côté auteur, et ce que ça veut dire selon le moment :
   *   - la demande n'a laissé aucune trace — personne ne s'est prononcé, rien
   *     dans le carnet, première version, pas de fil — : on l'efface pour de
   *     bon, elle quitte aussi la boîte de réception ;
   *   - elle a déjà été traitée, ou reprise après l'avoir été : on la marque
   *     seulement retirée. L'admin doit pouvoir constater ce qui a été enlevé,
   *     et ni le travail engagé ni l'historique ne s'évaporent avec elle.
   * La RLS applique exactement la même règle.
   */
  const cancel = useMutation({
    mutationFn: async (item: Feedback) => {
      const untouched =
        item.status === "nouveau" &&
        !item.note_id &&
        item.edits === 0 &&
        item.messages.length === 0;
      const { error } = untouched
        ? await supabaseClient.from("feedback").delete().eq("id", item.id)
        : await supabaseClient
            .from("feedback")
            .update({ cancelled_at: new Date().toISOString() })
            .eq("id", item.id);
      if (error) throw new Error(error.message);
      // Effacée pour de bon → ses images aussi (première version : aucune
      // révision ne les référence).
      if (untouched) {
        await removeFromBucket(item.images, FEEDBACK_BUCKET).catch(() => {});
      }
      return untouched;
    },
    onSuccess: invalidate,
  });

  /** Suppression par l'admin : la demande quitte la boîte de réception, mais
   *  la ligne reste (`deleted_at`) — l'auteur garde sa tuile, grisée, avec
   *  tout l'historique. Rien n'est effacé du bucket. La note du carnet, si
   *  elle existe, reste : c'est le backlog qui la gère. */
  const remove = useMutation({
    mutationFn: async (item: Feedback) => {
      const { error } = await supabaseClient
        .from("feedback")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { ...query, submit, edit, setStatus, reply, editMessage, cancel, remove };
};

export default useFeedback;

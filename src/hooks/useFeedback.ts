import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { FeedbackStatus, FeedbackType } from "../services/feedbackTypes";
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
  /** Email de l'auteur du message (jointure manuelle, admins seulement). */
  email?: string | null;
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
  /** Nombre de versions archivées : on n'en crée une que si la demande avait
   *  déjà été classée. Tant qu'elle attend, l'auteur retouche la version en
   *  cours. */
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
          "id, type, message, images, status, note_id, author_id, created_at, handled_at, cancelled_at, edits, updated_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      // L'auteur ne revoit pas ce qu'il a retiré ; l'admin, si.
      if (scope === "mine") {
        request = request
          .eq("author_id", userId as string)
          .is("cancelled_at", null);
      }

      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const base = (data ?? []) as Omit<Feedback, "messages">[];
      if (base.length === 0) return [];

      // Le fil de chaque demande, en une requête pour toutes : la RLS ne rend
      // que ce que la demande elle-même laisse lire.
      const { data: msgs, error: msgsError } = await supabaseClient
        .from("feedback_messages")
        .select("id, feedback_id, author_id, body, created_at")
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
      if (scope === "mine") return rows;

      // Comme reviews et photos : pas de FK vers public.users, on rapporte les
      // emails en une requête plutôt qu'une par ligne — auteurs des demandes
      // et des messages confondus.
      const ids = [
        ...new Set([
          ...rows.map((r) => r.author_id),
          ...rows.flatMap((r) => r.messages.map((m) => m.author_id)),
        ]),
      ];
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, email")
        .in("id", ids);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string]),
      );
      return rows.map((r) => ({
        ...r,
        email: emailById[r.author_id] ?? null,
        messages: r.messages.map((m) => ({
          ...m,
          email: emailById[m.author_id] ?? null,
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

  /** Correction par l'auteur. Le trigger en base remet la demande en attente :
   *  inutile (et impossible) de toucher au statut d'ici.
   *
   *  Les images retirées ne sont effacées du bucket que si la demande était
   *  encore en attente (retouche en place) : sinon le trigger vient d'archiver
   *  une version qui les référence encore. */
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
      if (item.status === "nouveau") {
        const dropped = item.images.filter((p) => !values.images.includes(p));
        await removeFromBucket(dropped, FEEDBACK_BUCKET).catch(() => {});
      }
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

  /**
   * « Supprimer », côté auteur, et ce que ça veut dire selon le moment :
   *   - la demande n'a laissé aucune trace — personne ne s'est prononcé, rien
   *     dans le carnet, première version — : on l'efface pour de bon, elle
   *     quitte aussi la boîte de réception ;
   *   - elle a déjà été traitée, ou reprise après l'avoir été : on la marque
   *     seulement retirée. L'admin doit pouvoir constater ce qui a été enlevé,
   *     et ni le travail engagé ni l'historique ne s'évaporent avec elle.
   * La RLS applique exactement la même règle.
   */
  const cancel = useMutation({
    mutationFn: async (item: Feedback) => {
      const untouched =
        item.status === "nouveau" && !item.note_id && item.edits === 0;
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

  /** Suppression pure et simple par l'admin, quel que soit l'état de la
   *  demande (la RLS ne l'autorise qu'à lui). La note du carnet, si elle
   *  existe, reste : c'est le backlog qui la gère. */
  const remove = useMutation({
    mutationFn: async (item: Feedback) => {
      // Les images des versions archivées partent avec la demande : on les
      // relève avant que la cascade n'efface les lignes.
      const { data: revisions } = await supabaseClient
        .from("feedback_revisions")
        .select("images")
        .eq("feedback_id", item.id);
      // La note du carnet, elle, reste (avec les fichiers qu'elle partage
      // avec la demande) : on ne touche pas à ce qu'elle référence.
      const kept = new Set<string>();
      if (item.note_id) {
        const { data: note } = await supabaseClient
          .from("admin_notes")
          .select("images")
          .eq("id", item.note_id)
          .maybeSingle();
        ((note?.images as string[]) ?? []).forEach((p) => kept.add(p));
      }
      const files = [
        ...item.images,
        ...(revisions ?? []).flatMap((r) => (r.images as string[]) ?? []),
      ].filter((p) => !kept.has(p));
      const { error } = await supabaseClient
        .from("feedback")
        .delete()
        .eq("id", item.id);
      if (error) throw new Error(error.message);
      await removeFromBucket(files, FEEDBACK_BUCKET).catch(() => {});
    },
    onSuccess: invalidate,
  });

  return { ...query, submit, edit, setStatus, reply, cancel, remove };
};

export default useFeedback;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useRealtimeTable from "./useRealtimeTable";
import useSession from "./useSession";

export type SuggestionStatus = "nouveau" | "accepte" | "refuse";

/** Proposition d'ajout d'un resto par un collaborateur (`restaurant_suggestions`). */
export interface RestaurantSuggestion {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  tags: string[] | null;
  comment: string | null;
  /** Position du lieu choisi dans la recherche OSM, null en saisie libre. */
  lat: number | null;
  lng: number | null;
  status: SuggestionStatus;
  admin_reply: string | null;
  /** Fiche créée à partir de la proposition. */
  restaurant_id: number | null;
  author_id: string;
  created_at: string;
  handled_at: string | null;
  /** Dernière correction par l'auteur (en attente seulement), null sinon. */
  updated_at: string | null;
  /** L'auteur l'a retirée de sa liste après décision ; l'admin la garde. */
  cancelled_at: string | null;
  /** Email de l'auteur (jointure manuelle) : vue admin seulement. */
  email?: string | null;
  /** Slug de la fiche créée, pour y mener depuis la liste. */
  restaurant_slug?: string | null;
}

export type SuggestionDraft = Pick<
  RestaurantSuggestion,
  "name" | "address" | "phone" | "website" | "tags" | "comment" | "lat" | "lng"
>;

export const SUGGESTION_STATUSES: Record<
  SuggestionStatus,
  { label: string; chip: string }
> = {
  nouveau: {
    label: "En attente",
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  accepte: {
    label: "Ajouté",
    chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  refuse: {
    label: "Refusé",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
};

/**
 * Propositions de restos. Comme `useFeedback`, `scope` ne fait que restreindre
 * la requête, la RLS tranche : chacun ses lignes, tout pour les admins.
 *   - "mine"  : l'onglet « Propositions » de Mon compte ;
 *   - "admin" : la liste à traiter, avec l'email de l'auteur.
 */
const useRestaurantSuggestions = (
  scope: "mine" | "admin" = "mine",
  enabled = true,
) => {
  const queryClient = useQueryClient();
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const active = enabled && !!userId;

  const query = useQuery<RestaurantSuggestion[], Error>({
    queryKey: ["restaurant-suggestions", scope, userId],
    enabled: active,
    queryFn: async () => {
      let request = supabaseClient
        .from("restaurant_suggestions")
        .select(
          "id, name, address, phone, website, tags, comment, lat, lng, status, admin_reply, restaurant_id, author_id, created_at, handled_at, updated_at, cancelled_at, restaurants(slug)",
        )
        .order("created_at", { ascending: false });
      // L'auteur ne revoit pas ce qu'il a retiré ; l'admin, si.
      if (scope === "mine")
        request = request
          .eq("author_id", userId as string)
          .is("cancelled_at", null);

      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const rows = (data ?? []).map(({ restaurants, ...r }: any) => ({
        ...r,
        restaurant_slug: restaurants?.slug ?? null,
      })) as RestaurantSuggestion[];
      if (scope === "mine" || rows.length === 0) return rows;

      const ids = [...new Set(rows.map((r) => r.author_id))];
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, email")
        .in("id", ids);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string]),
      );
      return rows.map((r) => ({ ...r, email: emailById[r.author_id] ?? null }));
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["restaurant-suggestions"] });
  // La décision de l'admin arrive en direct chez l'auteur (et sa puce s'allume),
  // une nouvelle proposition en direct chez l'admin.
  useRealtimeTable("restaurant_suggestions", invalidate, active);

  const submit = useMutation({
    mutationFn: async (draft: SuggestionDraft) => {
      const { error } = await supabaseClient
        .from("restaurant_suggestions")
        .insert(draft);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Auteur : corriger sa proposition, tant qu'elle attend (le trigger
   *  ignore toute correction d'une proposition déjà tranchée). */
  const edit = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: SuggestionDraft }) => {
      const { error } = await supabaseClient
        .from("restaurant_suggestions")
        .update(draft)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /**
   * Auteur, « Supprimer » — mêmes règles que les demandes : effacée pour de
   * bon tant qu'elle attend, simplement retirée de sa liste une fois tranchée
   * (l'admin la garde, la fiche créée vit sa vie). Renvoie `true` si effacée.
   */
  const cancel = useMutation({
    mutationFn: async (item: RestaurantSuggestion) => {
      const erase = item.status === "nouveau";
      const { error } = erase
        ? await supabaseClient.from("restaurant_suggestions").delete().eq("id", item.id)
        : await supabaseClient
            .from("restaurant_suggestions")
            .update({ cancelled_at: new Date().toISOString() })
            .eq("id", item.id);
      if (error) throw new Error(error.message);
      return erase;
    },
    onSuccess: invalidate,
  });

  /** Admin : accepter (avec la fiche créée), refuser, ou remettre en attente. */
  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
      restaurantId = null,
      reply = null,
    }: {
      id: number;
      status: SuggestionStatus;
      restaurantId?: number | null;
      reply?: string | null;
    }) => {
      const { error } = await supabaseClient
        .from("restaurant_suggestions")
        .update({
          status,
          restaurant_id: restaurantId,
          admin_reply: reply?.trim() || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Admin : supprimer la ligne pour de bon (proposition déjà tranchée ; la
   *  fiche créée, elle, reste). */
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabaseClient
        .from("restaurant_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { ...query, submit, edit, cancel, decide, remove };
};

export default useRestaurantSuggestions;

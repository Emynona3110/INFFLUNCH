import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";

export interface LunchParticipant {
  user_id: string;
  /** null = la personne a déclaré ne pas manger au restaurant aujourd'hui. */
  restaurant_id: number | null;
  /** Email (jointure public.users), pour le nom affiché. */
  email: string | null;
  /** profiles.avatar_path, null = initiales. */
  avatar_path: string | null;
}

/** Jour courant en heure de Paris, au format "AAAA-MM-JJ" (comme la colonne day). */
export const parisDay = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

/* ---------------------------- canal Realtime ----------------------------- */
// Le hook est monté par la page /dejeuner, la fiche resto et chaque card : on
// partage un seul canal pour tout le monde (compteur de références) au lieu
// d'en ouvrir un par instance.
let channel: ReturnType<typeof supabaseClient.channel> | null = null;
let refCount = 0;
const listeners = new Set<() => void>();

const openChannel = async () => {
  // La table est protégée par RLS : sans le JWT, la connexion Realtime reste
  // "anon" et le serveur ne délivre aucun événement (cf. waiting_list).
  const { data } = await supabaseClient.auth.getSession();
  // Tout a pu être démonté (ou déjà ouvert) pendant l'await.
  if (refCount === 0 || channel) return;
  await supabaseClient.realtime.setAuth(data.session?.access_token ?? null);
  if (refCount === 0 || channel) return;

  channel = supabaseClient
    .channel(`lunch_plans-rt-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lunch_plans" },
      () => listeners.forEach((fn) => fn())
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[realtime lunch_plans] statut:", status);
      }
    });
};

const closeChannel = () => {
  if (!channel) return;
  supabaseClient.removeChannel(channel);
  channel = null;
};

/**
 * « Qui déjeune où aujourd'hui » : la journée entière (≤ 100 lignes) est
 * chargée en une requête, puis groupée par restaurant. Une personne n'a qu'une
 * seule intention par jour (clé primaire user_id + day) : changer de
 * restaurant est un upsert, se retirer un delete.
 *
 * Une intention sans restaurant (`restaurant_id` null) veut dire « je ne mange
 * pas au resto ce midi » — gamelle, télétravail, peu importe.
 */
const useLunchToday = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const day = parisDay();
  const queryKey = ["lunch-today", day];

  const { data: participants = [], isPending } = useQuery<
    LunchParticipant[],
    Error
  >({
    queryKey,
    enabled: !!userId,
    // Pas de rafraîchissement périodique : la liste ne bouge QUE lorsque
    // quelqu'un fait ou change son choix, et Realtime nous le dit déjà. Seul
    // filet conservé : un refetch au retour sur l'onglet, car le canal peut
    // avoir été coupé pendant la veille (aucun appel tant qu'on ne revient pas).
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("lunch_plans")
        .select("user_id, restaurant_id")
        .eq("day", day);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as {
        user_id: string;
        restaurant_id: number | null;
      }[];
      if (rows.length === 0) return [];

      // lunch_plans référence auth.users : on joint manuellement public.users
      // et profiles pour le nom et l'avatar (même approche que useReviews).
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const [{ data: users }, { data: profiles }] = await Promise.all([
        supabaseClient.from("users").select("id, email").in("id", ids),
        supabaseClient.from("profiles").select("id, avatar_path").in("id", ids),
      ]);
      const emailById = Object.fromEntries(
        (users ?? []).map((u) => [u.id as string, u.email as string])
      );
      const avatarById = Object.fromEntries(
        (profiles ?? []).map((p) => [
          p.id as string,
          p.avatar_path as string | null,
        ])
      );

      return rows.map((r) => ({
        ...r,
        email: emailById[r.user_id] ?? null,
        avatar_path: avatarById[r.user_id] ?? null,
      }));
    },
  });

  // Abonnement Realtime partagé : les avatars apparaissent sans recharger.
  useEffect(() => {
    if (!userId) return;
    const onChange = () => queryClient.invalidateQueries({ queryKey });
    listeners.add(onChange);
    refCount += 1;
    if (refCount === 1) openChannel();

    return () => {
      listeners.delete(onChange);
      refCount -= 1;
      if (refCount === 0) closeChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, queryClient, day]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // restaurantId null = « je ne mange pas au resto ce midi ».
  const setMutation = useMutation({
    mutationFn: async (restaurantId: number | null) => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient
        .from("lunch_plans")
        .upsert(
          { user_id: userId, day, restaurant_id: restaurantId },
          { onConflict: "user_id,day" }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient
        .from("lunch_plans")
        .delete()
        .match({ user_id: userId, day });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Participants groupés par restaurant, dans l'ordre d'arrivée. */
  const byRestaurant = useMemo(() => {
    const map = new Map<number, LunchParticipant[]>();
    participants.forEach((p) => {
      if (p.restaurant_id == null) return; // « pas au resto » : pas de tablée
      const list = map.get(p.restaurant_id);
      if (list) list.push(p);
      else map.set(p.restaurant_id, [p]);
    });
    return map;
  }, [participants]);

  const myPlan = participants.find((p) => p.user_id === userId) ?? null;

  return {
    participants,
    byRestaurant,
    /** J'ai déclaré quelque chose aujourd'hui — restaurant ou « pas au resto ».
     *  Le « pas au resto » ne regarde que l'intéressé : il n'est ni compté ni
     *  affiché ailleurs, il sert juste à éteindre la puce de l'onglet. */
    hasPlan: !!myPlan,
    /** Restaurant où je déjeune, null si je n'ai pas choisi OU pas de resto. */
    myRestaurantId: myPlan?.restaurant_id ?? null,
    loading: isPending,
    saving: setMutation.isPending || clearMutation.isPending,
    setLunch: setMutation.mutateAsync,
    clearLunch: clearMutation.mutateAsync,
  };
};

export default useLunchToday;

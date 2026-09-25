import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import useAchievements from "./useAchievements";

/** Pourquoi on ne mange pas au restaurant : présent sur site mais déjeunant
 *  autrement (gamelle, plat apporté, resto de son côté), ou absent du site.
 *  On ne demande PAS le motif de l'absence (télétravail, congé…) : le déjeuner
 *  n'a besoin que de savoir si l'on est joignable sur site. */
export type LunchOffReason = "on_site" | "away";

export interface LunchParticipant {
  user_id: string;
  /** null = la personne a déclaré ne pas manger au restaurant aujourd'hui. */
  restaurant_id: number | null;
  /** Qualification du « pas au restaurant » (null quand un restaurant est
   *  choisi, ou pour les lignes d'avant le 2026-09-25 : non précisé). */
  off_reason: LunchOffReason | null;
  /** Email (jointure public.users), pour le nom affiché. */
  email: string | null;
  /** profiles.avatar_path, null = initiales. */
  avatar_path: string | null;
}

/** Jour courant en heure de Paris, au format "AAAA-MM-JJ" (comme la colonne day). */
export const parisDay = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

/** Samedi ou dimanche (heure de Paris) : personne ne déjeune au bureau, on ne
 *  pose pas la question du midi. Déclarer reste possible, on n'insiste juste
 *  pas (pas de puce, pas d'encart en pointillés). */
export const isWeekend = () => {
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
  });
  return day === "Sat" || day === "Sun";
};

/** Heure courante à Paris (0-23), pour le succès « Speedrunner ». */
const parisHour = () =>
  Number(
    new Date().toLocaleTimeString("en-US", {
      timeZone: "Europe/Paris",
      hour12: false,
      hour: "2-digit",
    })
  );

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
 * pas au resto ce midi », qualifiée par `off_reason` : « pas de restaurant »
 * (sur site, mais gamelle ou déjeuner de son côté) ou « pas sur site ».
 */
const useLunchToday = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const { unlock } = useAchievements();
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
        .select("user_id, restaurant_id, off_reason")
        .eq("day", day);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as {
        user_id: string;
        restaurant_id: number | null;
        off_reason: LunchOffReason | null;
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    // Série de midis (succès « Flambé ») et compteur du profil.
    queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
  };

  // Une déclaration, deux formes : un restaurant, ou une absence de restaurant
  // qualifiée (« pas de restaurant » / « pas sur site »). Les deux s'excluent, la
  // contrainte lunch_plans_off_reason_coherent le garantit en base.
  const setMutation = useMutation({
    mutationFn: async (plan: {
      restaurantId: number | null;
      offReason: LunchOffReason | null;
    }) => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient.from("lunch_plans").upsert(
        {
          user_id: userId,
          day,
          restaurant_id: plan.restaurantId,
          off_reason: plan.offReason,
        },
        { onConflict: "user_id,day" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, plan) => {
      invalidate();
      // Succès secret « Speedrunner » : un restaurant (pas « pas au resto »)
      // choisi avant 8 h, heure de Paris.
      if (plan.restaurantId != null && parisHour() < 8) unlock("speedrunner");
    },
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
     *  Le « pas au resto » n'est pas compté dans les inscrits : il apparaît
     *  seulement sur la page du midi et éteint la puce de l'onglet. */
    hasPlan: !!myPlan,
    /** Restaurant où je déjeune, null si je n'ai pas choisi OU pas de resto. */
    myRestaurantId: myPlan?.restaurant_id ?? null,
    /** Ma raison de ne pas aller au resto, null si je vais au resto ou n'ai
     *  rien déclaré. Une ancienne ligne sans raison est traitée comme
     *  « pas de restaurant » (sur site), le cas le plus courant. */
    myOffReason: myPlan && myPlan.restaurant_id == null
      ? myPlan.off_reason ?? "on_site"
      : null,
    loading: isPending,
    saving: setMutation.isPending || clearMutation.isPending,
    /** « Je déjeune dans ce restaurant. » */
    setLunch: (restaurantId: number) =>
      setMutation.mutateAsync({ restaurantId, offReason: null }),
    /** « Je ne vais pas au resto », en disant lequel des deux cas. */
    setLunchOff: (offReason: LunchOffReason) =>
      setMutation.mutateAsync({ restaurantId: null, offReason }),
    clearLunch: clearMutation.mutateAsync,
  };
};

export default useLunchToday;

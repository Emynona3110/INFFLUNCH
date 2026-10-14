import { useEffect, useMemo } from "react";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";
import useAchievements from "./useAchievements";
import { clearLunchPriceSkip } from "../services/lunchPriceSkip";

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
  /** Heure de départ "HH:MM" (tranche de 15 min, 11:30-14:00), null = « je ne
   *  sais pas ». Toujours null hors restaurant. */
  departure_time: string | null;
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

/** Heure courante à Paris (0-23), pour les succès « Premier arrivé, premier servi » / « Mieux vaut tard que jamais ». */
const parisHour = () =>
  Number(
    new Date().toLocaleTimeString("en-US", {
      timeZone: "Europe/Paris",
      hour12: false,
      hour: "2-digit",
    })
  );

/** Heure (Paris) avant laquelle déclarer son midi vaut le succès « Premier arrivé, premier servi ».
 *  Son pendant tardif est LUNCH_CUTOFF_HOUR (succès « Mieux vaut tard que jamais »). */
const SPRINTER_HOUR = 10;

/** Heure (Paris) à partir de laquelle le midi est joué : on ne demande plus où
 *  l'on va, on demande combien ça a coûté, et toute modification du jour
 *  devient suspecte (fausse manœuvre) plutôt que normale. */
export const LUNCH_CUTOFF_HOUR = 14;

/** Le déjeuner du jour est passé. Lu au rendu, pas réactif : à 14 h pile, le
 *  basculement attend la prochaine interaction — personne ne regarde l'écran
 *  en espérant qu'il change tout seul. */
export const isAfterLunch = () => parisHour() >= LUNCH_CUTOFF_HOUR;

/** TEMPORAIRE (tests) : la popup d'heure de départ s'ouvre à toute heure.
 *  Repasser à false après les tests : passé 14 h, on note son midi après coup
 *  et l'heure de départ n'a plus d'intérêt. */
const DEPARTURE_ASK_ANYTIME = true;

/** Demander l'heure de départ après avoir créé ou rejoint une tablée ? */
export const shouldAskDeparture = () =>
  DEPARTURE_ASK_ANYTIME || !isAfterLunch();

/** "12:00" → "12h", "12:15" → "12h15". */
export const formatDeparture = (time: string) => {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
};

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

/** Tablées du jour : options partagées par le hook et le préchargement au
 *  survol de l'onglet (usePrefetch). */
export const lunchTodayQueryOptions = (day: string) =>
  queryOptions<LunchParticipant[], Error>({
    queryKey: ["lunch-today", day],
    // Pas de rafraîchissement périodique : la liste ne bouge QUE lorsque
    // quelqu'un fait ou change son choix, et Realtime nous le dit déjà. Seul
    // filet conservé : un refetch au retour sur l'onglet, car le canal peut
    // avoir été coupé pendant la veille (aucun appel tant qu'on ne revient pas).
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("lunch_plans")
        .select("user_id, restaurant_id, off_reason, departure_time")
        .eq("day", day);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as {
        user_id: string;
        restaurant_id: number | null;
        off_reason: LunchOffReason | null;
        departure_time: string | null;
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
        // Postgres renvoie "12:15:00" : on ne garde que les heures et minutes.
        departure_time: r.departure_time?.slice(0, 5) ?? null,
        email: emailById[r.user_id] ?? null,
        avatar_path: avatarById[r.user_id] ?? null,
      }));
    },
  });

/** File commune des écritures du midi (cf. « écritures optimistes »). */
const LUNCH_MUTATION_KEY = ["lunch-plan-write"];
const LUNCH_MUTATION_SCOPE = { id: "lunch-plan-write" };

type PlanFields = Pick<
  LunchParticipant,
  "restaurant_id" | "off_reason" | "departure_time"
>;
/** Ma ligne du jour telle qu'on l'écrit, + l'heure abandonnée au passage. */
type PlanRow = PlanFields & { dropped: string | null };

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

  const { data: participants = [], isPending } = useQuery({
    ...lunchTodayQueryOptions(day),
    enabled: !!userId,
  });

  const myPlan = participants.find((p) => p.user_id === userId) ?? null;

  // Heure que j'avais avant de changer de tablée : l'heure est effacée au
  // changement, mais la popup la repropose. Dans le cache (et non un state)
  // pour être partagée par toutes les instances du hook, dialogue compris.
  const prevDepartureKey = ["lunch-prev-departure", day];
  const { data: previousDeparture = null } = useQuery<string | null>({
    queryKey: prevDepartureKey,
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  });

  // Abonnement Realtime partagé : les avatars apparaissent sans recharger.
  useEffect(() => {
    if (!userId) return;
    // Pendant mes écritures, on laisse passer : le rechargement de fin de file
    // ramènera aussi les changements des autres.
    const onChange = () => {
      if (queryClient.isMutating({ mutationKey: LUNCH_MUTATION_KEY }) > 0) return;
      queryClient.invalidateQueries({ queryKey });
    };
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

  /**
   * Retire du cache la relance de prix du JOUR, sans attendre le réseau.
   *
   * Sans cela, annuler son midi laissait la relance à l'écran le temps de
   * l'aller-retour (TanStack sert les anciennes données pendant un refetch) :
   * l'encart se rétablissait d'abord, la relance ne partait qu'un tiers de
   * seconde plus tard, et l'écran bougeait en deux temps. Les deux blocs
   * glissent maintenant ensemble, et `invalidate` repose ensuite la bonne
   * relance s'il y en a une (nouveau restaurant déclaré).
   *
   * Typé sur place : useUnpricedLunches importe ce fichier, lui emprunter son
   * type refermerait le cycle.
   */
  const dropTodayPriceAsk = () => {
    // Masquée plutôt que retirée : retirée, la relance précédente (que
    // celle du jour avait remplacée) reparaîtrait le temps du refetch.
    queryClient.setQueryData<
      { restaurantId: number; day: string; opens: boolean; priced: boolean }[]
    >(["unpriced-lunches", userId], (prev) =>
      (prev ?? []).map((l) =>
        l.day === day ? { ...l, opens: true, priced: true } : l
      )
    );
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    // Série de midis (succès « Tout feu tout flamme ») et compteur du profil.
    queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
    // Relances de prix : déclarer un restaurant à 18 h crée aussitôt un midi à
    // chiffrer, le retirer fait disparaître la relance. Sans cette ligne, la
    // page du midi attendrait l'expiration du cache pour s'en apercevoir.
    queryClient.invalidateQueries({ queryKey: ["unpriced-lunches"] });
  };

  // Une déclaration, deux formes : un restaurant, ou une absence de restaurant
  // qualifiée (« pas de restaurant » / « pas sur site »). Les deux s'excluent, la
  // contrainte lunch_plans_off_reason_coherent le garantit en base.
  /* ------------------------- écritures optimistes ------------------------
   * Choisir, rejoindre, « pas de resto », retirer, l'heure : l'écran change
   * au clic, le serveur suit. En cas de refus, on rétablit la liste d'avant
   * et l'appelant affiche l'erreur.
   *
   * Toutes ces écritures partagent un `scope` : TanStack les exécute l'une
   * après l'autre, dans l'ordre des clics. Sans cela, rejoindre puis donner
   * son heure aussitôt pouvait envoyer l'heure AVANT que la ligne existe
   * (update sans effet), et deux changements rapides arriver dans le désordre.
   * Pour la même raison, on ne recharge la liste qu'une fois la dernière
   * écriture terminée : un rechargement intermédiaire effacerait l'état
   * optimiste des suivantes, l'écran ferait des allers-retours. */
  const meInCache = () =>
    queryClient
      .getQueryData<LunchParticipant[]>(queryKey)
      ?.find((p) => p.user_id === userId) ?? null;

  /** Écrit ma ligne dans le cache (création si besoin), rend l'ancienne liste. */
  const patchMe = async (patch: PlanFields | null) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<LunchParticipant[]>(queryKey);
    queryClient.setQueryData<LunchParticipant[]>(queryKey, (prev = []) => {
      if (patch == null) return prev.filter((p) => p.user_id !== userId);
      if (prev.some((p) => p.user_id === userId))
        return prev.map((p) => (p.user_id === userId ? { ...p, ...patch } : p));
      // Première déclaration du jour : nom et avatar pris dans la session et
      // le profil déjà chargés, le refetch les confirmera.
      return [
        ...prev,
        {
          user_id: userId as string,
          ...patch,
          email: sessionData?.user?.email ?? null,
          avatar_path:
            queryClient.getQueryData<{ avatar_path: string | null } | null>([
              "profile",
              userId,
            ])?.avatar_path ?? null,
        },
      ];
    });
    return { previous };
  };

  const rollback = (context?: { previous?: LunchParticipant[] }) => {
    if (context) queryClient.setQueryData(queryKey, context.previous);
  };

  /** Rechargement après la DERNIÈRE écriture en file (cf. plus haut). Pendant
   *  onSettled, l'écriture qui se termine compte encore parmi les en-cours. */
  const settle = () => {
    if (queryClient.isMutating({ mutationKey: LUNCH_MUTATION_KEY }) <= 1)
      invalidate();
  };

  /** Ligne à écrire pour ce choix, calculée À L'APPEL depuis le cache (qui
   *  contient déjà les écritures précédentes encore en route). L'heure de
   *  départ appartient à la tablée : gardée si l'on redéclare le même
   *  restaurant, effacée (et mise en réserve) si l'on en change. */
  const planRow = (
    restaurantId: number | null,
    offReason: LunchOffReason | null
  ): PlanRow => {
    const me = meInCache();
    const keep = restaurantId != null && restaurantId === me?.restaurant_id;
    return {
      restaurant_id: restaurantId,
      off_reason: offReason,
      departure_time: keep ? me?.departure_time ?? null : null,
      dropped: keep ? null : me?.departure_time ?? null,
    };
  };

  // Une déclaration, deux formes : un restaurant, ou une absence de restaurant
  // qualifiée (« pas de restaurant » / « pas sur site »). Les deux s'excluent, la
  // contrainte lunch_plans_off_reason_coherent le garantit en base.
  const setMutation = useMutation({
    mutationKey: LUNCH_MUTATION_KEY,
    scope: LUNCH_MUTATION_SCOPE,
    mutationFn: async (plan: PlanRow) => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient.from("lunch_plans").upsert(
        {
          user_id: userId,
          day,
          restaurant_id: plan.restaurant_id,
          off_reason: plan.off_reason,
          departure_time: plan.departure_time,
        },
        { onConflict: "user_id,day" }
      );
      if (error) throw new Error(error.message);
    },
    onMutate: async (plan) => {
      // Changement de tablée avec une heure posée : on la garde en réserve,
      // la popup la repropose.
      if (plan.dropped) queryClient.setQueryData(prevDepartureKey, plan.dropped);
      dropTodayPriceAsk();
      return patchMe({
        restaurant_id: plan.restaurant_id,
        off_reason: plan.off_reason,
        departure_time: plan.departure_time,
      });
    },
    onError: (_e, _plan, context) => rollback(context),
    onSuccess: (_data, plan) => {
      if (plan.restaurant_id == null) return;
      // Redéclarer un déjeuner ici lève le refus posé sur la relance de prix :
      // on a pu annuler son midi, puis revenir dans ce restaurant — à ce
      // moment-là, la question du prix se pose de nouveau. Fermer la relance
      // voulait dire « pas celle-là », pas « plus jamais pour ce resto ».
      clearLunchPriceSkip(userId, plan.restaurant_id);
      // Succès secrets des deux extrêmes de la journée : un RESTAURANT (pas
      // « pas au resto ») choisi très tôt ou après que le déjeuner soit passé.
      // Heure de Paris ; « après 14 h » = le seuil du midi (isAfterLunch).
      if (parisHour() < SPRINTER_HOUR) unlock("lunch_early");
      else if (isAfterLunch()) unlock("lunch_late");
    },
    onSettled: settle,
  });

  // Heure de départ seule : la ligne existe déjà, ou est en route (même file).
  const departureMutation = useMutation({
    mutationKey: LUNCH_MUTATION_KEY,
    scope: LUNCH_MUTATION_SCOPE,
    mutationFn: async (time: string | null) => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient
        .from("lunch_plans")
        .update({ departure_time: time })
        .match({ user_id: userId, day });
      if (error) throw new Error(error.message);
    },
    onMutate: async (time) => {
      const me = meInCache();
      if (!me) return undefined;
      return patchMe({
        restaurant_id: me.restaurant_id,
        off_reason: me.off_reason,
        departure_time: time,
      });
    },
    onError: (_e, _time, context) => rollback(context),
    onSettled: settle,
  });

  const clearMutation = useMutation({
    mutationKey: LUNCH_MUTATION_KEY,
    scope: LUNCH_MUTATION_SCOPE,
    mutationFn: async () => {
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const { error } = await supabaseClient
        .from("lunch_plans")
        .delete()
        .match({ user_id: userId, day });
      if (error) throw new Error(error.message);
    },
    onMutate: async () => {
      dropTodayPriceAsk();
      return patchMe(null);
    },
    onError: (_e, _v, context) => rollback(context),
    onSettled: settle,
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

  // Succès secret « Cowabunga ! » (tablée de COWABUNGA_TABLE) : décerné côté
  // serveur par un trigger sur lunch_plans, à toute la tablée, même à qui ne
  // rouvre pas l'appli (sql/2026-10-06_cowabunga_serveur.sql). Le toast arrive
  // via useAchievements (lignes seen = false).

  return {
    participants,
    byRestaurant,
    /** J'ai déclaré quelque chose aujourd'hui — restaurant ou « pas au resto ».
     *  Le « pas au resto » n'est pas compté dans les inscrits : il apparaît
     *  seulement sur la page du midi et éteint la puce de l'onglet. */
    hasPlan: !!myPlan,
    /** Restaurant où je déjeune, null si je n'ai pas choisi OU pas de resto. */
    myRestaurantId: myPlan?.restaurant_id ?? null,
    /** Mon heure de départ "HH:MM", null si non précisée. */
    myDeparture: myPlan?.departure_time ?? null,
    /** Mon heure dans la tablée que je viens de quitter (proposée à nouveau). */
    previousDeparture,
    /** Ma raison de ne pas aller au resto, null si je vais au resto ou n'ai
     *  rien déclaré. Une ancienne ligne sans raison est traitée comme
     *  « pas de restaurant » (sur site), le cas le plus courant. */
    myOffReason: myPlan && myPlan.restaurant_id == null
      ? myPlan.off_reason ?? "on_site"
      : null,
    loading: isPending,
    /** « Je déjeune dans ce restaurant. » */
    setLunch: (restaurantId: number) =>
      setMutation.mutateAsync(planRow(restaurantId, null)),
    /** « Je ne vais pas au resto », en disant lequel des deux cas. */
    setLunchOff: (offReason: LunchOffReason) =>
      setMutation.mutateAsync(planRow(null, offReason)),
    clearLunch: clearMutation.mutateAsync,
    /** Mon heure de départ ("HH:MM"), null = « je ne sais pas ». */
    setDeparture: departureMutation.mutateAsync,
  };
};

export default useLunchToday;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LuMapPinOff, LuSandwich, LuUtensils, LuUtensilsCrossed } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import LunchPickDialog from "@/components/LunchPickDialog";
import LunchOffDialog from "@/components/LunchOffDialog";
import useLunchToday, {
  isWeekend,
  LunchOffReason,
  LunchParticipant,
} from "@/hooks/useLunchToday";
import useRestaurants from "@/hooks/useRestaurants";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import AuthorButton from "@/components/AuthorButton";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";
import { formatAuthorName } from "@/utils/authorName";
import { SECTION_BODY } from "@/lib/sectionClasses";
import { HOVER_ZOOM_IMG } from "@/lib/imageClasses";

/** "Jeudi 28 août" (première lettre en majuscule). */
const todayLabel = () => {
  const s = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Ressort commun à toutes les animations de la page. */
const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

/**
 * Ligne « hors restaurant » : même gabarit qu'une tablée, mais sans image, sans
 * lien et sans bouton Rejoindre — on s'y déclare depuis l'encart du haut
 * (« Pas de resto »). Il y en a deux, et c'est le but : être sur site sans
 * aller au resto laisse la porte ouverte aux collègues, être absent non.
 */
const OffTable = ({
  people,
  label,
  icon: Icon,
  mine,
}: {
  people: LunchParticipant[];
  label: string;
  icon: typeof LuSandwich;
  /** C'est ma ligne : fond teinté sur mobile, anneau sur desktop. */
  mine: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className={cn(
      // Aucun contour : ce n'est pas une tablée, juste du contexte. Ma ligne se
      // repère au fond teinté, pas à un anneau.
      "flex items-center gap-3 overflow-hidden rounded-card p-2.5 sm:gap-4 sm:bg-card sm:p-3",
      mine && "bg-primary/5 sm:bg-primary/5"
    )}
  >
    <span className="relative flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-foreground/5 sm:h-16 sm:w-24">
      {/* Couleur OPAQUE + `opacity` sur le svg, jamais `text-foreground/45` :
          une icône barrée ou croisée (LuMapPinOff, LuUtensilsCrossed) dessine
          des traits qui se recouvrent, et en couleur translucide chaque
          intersection cumule son alpha — on y voit une seconde icône
          superposée. L'opacité de groupe compose les traits d'abord et
          n'atténue qu'ensuite. */}
      <Icon className="h-5 w-5 text-foreground opacity-45 sm:h-6 sm:w-6" />
      <motion.span
        key={people.length}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="absolute bottom-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/35 px-1 text-[11px] font-bold text-white shadow sm:bottom-1 sm:right-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs"
      >
        {people.length}
      </motion.span>
    </span>

    <div className="min-w-0 flex-1">
      <div className="truncate font-display text-base font-bold text-foreground/70 sm:text-lg">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="hidden -space-x-2 sm:flex">
          <AnimatePresence initial={false}>
            {people.slice(0, 5).map((p) => (
              <motion.span
                key={p.user_id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={spring}
                className="inline-flex"
              >
                <Avatar email={p.email} avatarPath={p.avatar_path} size={26} />
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
        {/* Mobile : noms en texte simple, comme sur les tablées. */}
        <span className="min-w-0 truncate text-xs text-foreground/55">
          {people.map((p, i) => (
            <span key={p.user_id}>
              {i > 0 && ", "}
              <span className="sm:hidden">{formatAuthorName(p.email)}</span>
              <AuthorButton
                userId={p.user_id}
                email={p.email}
                className="hidden hover:text-foreground sm:inline"
              />
            </span>
          ))}
        </span>
      </div>
    </div>
  </motion.div>
);

/**
 * Section « Déjeuner » : qui déjeune où aujourd'hui. Il n'y a ni organisateur ni
 * invitation — chacun déclare son restaurant du jour et les tablées se forment
 * par regroupement. La liste se met à jour en direct (Realtime) ; les arrivées
 * et départs se font en fondu, sans animation de position (les cartes ne
 * glissent pas). On choisit et on annule depuis l'encart du haut ; les tablées
 * portent un bouton « Rejoindre » (sauf la mienne) et mènent à la fiche.
 */
const LunchToday = () => {
  const navigate = useNavigate();
  const [pickOpen, setPickOpen] = useState(false);
  const [offOpen, setOffOpen] = useState(false);

  const { data: restaurants, loading: restaurantsLoading } = useRestaurants(
    defaultRestaurantFilters
  );
  const {
    participants,
    byRestaurant,
    hasPlan,
    myRestaurantId,
    myOffReason,
    loading,
    saving,
    setLunch,
    setLunchOff,
    clearLunch,
  } = useLunchToday();

  const restById = useMemo(
    () => new Map(restaurants.map((r) => [r.id, r])),
    [restaurants]
  );

  // « Inscrits » = ceux qui vont au restaurant (compteur de l'entête). Ceux qui
  // ont déclaré ne pas manger au resto forment deux « tablées » à part,
  // affichées après les vraies, sans image ni bouton Rejoindre : être sur site
  // sans aller au resto n'a pas le même sens qu'être absent (on peut croiser le
  // premier, lui rapporter quelque chose, grouper une commande).
  const registered = useMemo(
    () => participants.filter((p) => p.restaurant_id != null),
    [participants]
  );
  // Une ligne d'avant le 2026-09-25 n'a pas de raison : on la range avec « pas
  // de restaurant », le cas le plus courant (le hook fait pareil pour moi).
  const onSite = useMemo(
    () =>
      participants.filter(
        (p) => p.restaurant_id == null && p.off_reason !== "away"
      ),
    [participants]
  );
  const away = useMemo(
    () => participants.filter((p) => p.off_reason === "away"),
    [participants]
  );

  // Une tablée par restaurant, la plus fournie en premier (nom en cas d'égalité).
  const tables = useMemo(
    () =>
      [...byRestaurant.entries()]
        .flatMap(([id, people]) => {
          const restaurant = restById.get(id);
          return restaurant ? [{ restaurant, people }] : [];
        })
        .sort(
          (a, b) =>
            b.people.length - a.people.length ||
            a.restaurant.name.localeCompare(b.restaurant.name, "fr")
        ),
    [byRestaurant, restById]
  );

  // L'état de l'encart ne dépend QUE du midi (déjà connu), jamais du chargement
  // de la liste des restaurants : sinon on affiche une fraction de seconde
  // « pas encore choisi » (bouton bleu) avant que le nom du resto n'arrive.
  // hasPlan couvre les deux déclarations possibles : un restaurant, ou « pas au
  // resto », qui ne porte pas de restaurant mais toujours une raison.
  const skipsRestaurant = myOffReason != null;
  const awayToday = myOffReason === "away";
  // Week-end sans déclaration : on ne réclame rien, l'encart reste neutre.
  const weekendOff = !hasPlan && isWeekend();
  const myRestaurant = myRestaurantId ? restById.get(myRestaurantId) : undefined;
  // Nom du resto choisi : null tant qu'on l'ignore (→ ligne fantôme).
  const myRestaurantName =
    myRestaurant?.name ?? (restaurantsLoading ? null : "Restaurant inconnu");

  const guard = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : String(e),
        status: "error",
        duration: 5000,
      });
    }
  };

  const join = (restaurantId: number) => guard(() => setLunch(restaurantId));
  /** « Je ne mange pas au resto », en disant lequel des deux cas. */
  const skip = (reason: LunchOffReason) => guard(() => setLunchOff(reason));
  const leave = () => guard(() => clearLunch());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Entête : le jour + le compteur, qui « pope » à chaque arrivée. */}
      <div className="mb-2.5 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <div
            role="heading"
            aria-level={1}
            className="font-display text-lg font-extrabold text-foreground sm:text-2xl"
          >
            Qui déjeune où
          </div>
          <p className="mb-0 mt-0.5 text-[13px] text-foreground/55 sm:text-sm">{todayLabel()}</p>
        </div>

        {registered.length > 0 && (
          <div className="flex shrink-0 items-baseline gap-1.5">
            <motion.span
              key={registered.length}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="font-display text-2xl font-extrabold leading-none text-primary sm:text-3xl"
            >
              {registered.length}
            </motion.span>
            <span className="text-sm text-foreground/55">
              inscrit{registered.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Mon statut du jour : appel à l'action tant que je n'ai pas choisi.
          Pendant le chargement, encart neutre (ni texte ni bouton) : c'est ce
          qui évitait de « faire clignoter » le bouton au changement d'onglet. */}
      {loading ? (
        <div className="mb-3 sm:mb-6 flex items-center gap-3 rounded-card border border-border bg-card px-3 py-3 sm:px-5 sm:py-4">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-foreground/10" />
          <div className="flex h-12 items-center">
            <span className="h-5 w-52 animate-pulse rounded bg-foreground/10" />
          </div>
        </div>
      ) : (
      <div
        className={cn(
          "mb-3 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5 rounded-card px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-4 transition-colors",
          hasPlan
            ? "border border-border bg-gradient-to-r from-primary/10 to-transparent"
            : weekendOff
              ? "border border-border bg-card"
              : "border border-dashed border-primary/40 bg-card"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10",
              hasPlan
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {awayToday ? (
              <LuMapPinOff className="h-5 w-5" />
            ) : skipsRestaurant ? (
              <LuSandwich className="h-5 w-5" />
            ) : weekendOff ? (
              <LuUtensilsCrossed className="h-5 w-5" />
            ) : (
              <LuUtensils className="h-5 w-5" />
            )}
          </span>
          <div className="flex h-11 min-w-0 flex-col justify-center sm:h-12">
            {skipsRestaurant ? (
              <div className="text-sm text-foreground/70">
                {awayToday
                  ? "Ce midi, tu n'es pas sur site."
                  : "Ce midi, tu es sur site sans aller au restaurant."}
              </div>
            ) : hasPlan ? (
              <>
                <div className="text-sm text-foreground/55">
                  Ce midi, tu vas au
                </div>
                {myRestaurantName ? (
                  <div className="truncate font-display text-base font-bold sm:text-lg text-card-foreground">
                    {myRestaurantName}
                  </div>
                ) : (
                  <div className="mt-1 h-5 w-40 animate-pulse rounded bg-foreground/10" />
                )}
              </>
            ) : weekendOff ? (
              <div className="text-sm text-foreground/70">
                C'est le week-end, pas de resto du midi à choisir.
              </div>
            ) : (
              <div className="text-sm text-foreground/70">
                <span className="sm:hidden">Pas encore de resto choisi ce midi.</span>
                <span className="hidden sm:inline">
                  Tu n'as pas encore choisi ton restaurant pour ce midi.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile : les boutons prennent toute la largeur sous le texte. Le
            week-end, aucun conteneur : un bloc `w-full` vide passerait quand
            même à la ligne et ajouterait le `gap` sous le texte. */}
        {weekendOff ? null : (
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {hasPlan ? (
              <Button
                variant="outline"
                onClick={leave}
                loading={saving}
                className="flex-1 sm:flex-none"
              >
                Annuler
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setPickOpen(true)}
                  disabled={saving || restaurantsLoading}
                  className="flex-1 sm:flex-none"
                >
                  <span className="sm:hidden">Choisir un resto</span>
                  <span className="hidden sm:inline">Choisir un restaurant</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOffOpen(true)}
                  disabled={saving}
                  className="flex-1 sm:flex-none"
                >
                  Pas de resto
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Tablées du jour. */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : tables.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-card px-4 py-8 sm:px-6 sm:py-12 text-center"
        >
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <LuUtensils className="h-10 w-10 text-primary" />
          </motion.span>
          <p className="m-0 text-sm text-foreground/60">
            Personne n'a encore choisi. Sois le premier à proposer un restaurant
            pour ce midi.
          </p>
        </motion.div>
      ) : (
        /* Mobile : tablées empilées dans un cadre de section (filets) ; desktop :
           tuiles espacées. */
        <div className={cn(SECTION_BODY, "divide-y divide-border sm:flex sm:flex-col sm:gap-3 sm:divide-y-0")}>
          <AnimatePresence initial={false}>
            {tables.map(({ restaurant, people }) => {
              const mine = restaurant.id === myRestaurantId;
              return (
                <motion.article
                  key={restaurant.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
                  className={cn(
                    "group flex cursor-pointer select-none items-center gap-3 overflow-hidden p-2.5 transition sm:rounded-card sm:bg-card sm:gap-4 sm:p-3 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_14px_34px_-16px_rgba(2,8,40,0.30)]",
                    // Ma tablée : fond teinté sur mobile, anneau sur desktop.
                    mine
                      ? "bg-primary/5 sm:bg-card sm:ring-2 sm:ring-primary"
                      : "sm:border sm:border-border"
                  )}
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-24">
                    <img
                      src={restaurant.image || noImage}
                      alt=""
                      className={cn(
                        HOVER_ZOOM_IMG,
                        restaurant.closed && "grayscale"
                      )}
                    />
                    {/* Nombre de convives, en pastille sur la vignette. */}
                    <motion.span
                      key={people.length}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring}
                      className="absolute bottom-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow sm:bottom-1 sm:right-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs"
                    >
                      {people.length}
                    </motion.span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-bold sm:text-lg text-card-foreground">
                      {restaurant.name}
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {/* Mobile : pas d'avatars, seulement les noms. */}
                      <span className="hidden -space-x-2 sm:flex">
                        <AnimatePresence initial={false}>
                          {people.slice(0, 5).map((p) => (
                            <motion.span
                              key={p.user_id}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={spring}
                              className="inline-flex"
                            >
                              <Avatar
                                email={p.email}
                                avatarPath={p.avatar_path}
                                size={26}
                              />
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </span>
                      {/* Mobile : noms en texte simple (pas de lien profil,
                          la ligne entière ouvre la fiche) ; desktop : cliquables. */}
                      <span className="min-w-0 truncate text-xs text-foreground/55">
                        {people.map((p, i) => (
                          <span key={p.user_id}>
                            {i > 0 && ", "}
                            <span className="sm:hidden">{formatAuthorName(p.email)}</span>
                            <AuthorButton
                              userId={p.user_id}
                              email={p.email}
                              className="hidden hover:text-foreground sm:inline"
                            />
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>

                  {/* Rejoindre : uniquement sur les tablées où je ne suis pas
                      (la mienne se quitte depuis l'encart du haut), et jamais
                      sur un restaurant fermé entre-temps. */}
                  {!mine && !restaurant.closed && (
                    <Button
                      aria-label="Rejoindre"
                      className="h-9 w-9 shrink-0 rounded-full px-0 sm:h-10 sm:w-auto sm:rounded-lg sm:px-4"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        join(restaurant.id);
                      }}
                    >
                      <FiPlus className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Rejoindre</span>
                    </Button>
                  )}
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Ceux qui ne déjeunent pas au restaurant, après les tablées : c'est du
          contexte, la question du midi reste « qui va où ». */}
      {!loading && (onSite.length > 0 || away.length > 0) && (
        <div className="mt-3 flex flex-col gap-1 sm:mt-6 sm:gap-3">
          <AnimatePresence initial={false}>
            {onSite.length > 0 && (
              <OffTable
                key="on_site"
                people={onSite}
                label="Pas de restaurant"
                icon={LuSandwich}
                mine={myOffReason === "on_site"}
              />
            )}
            {away.length > 0 && (
              <OffTable
                key="away"
                people={away}
                label="Pas sur site"
                icon={LuMapPinOff}
                mine={awayToday}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      <LunchPickDialog
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        restaurants={restaurants}
        currentId={myRestaurantId}
        onPick={(id) => {
          setPickOpen(false);
          join(id);
        }}
      />

      <LunchOffDialog
        open={offOpen}
        onClose={() => setOffOpen(false)}
        current={myOffReason}
        onPick={(reason) => {
          setOffOpen(false);
          skip(reason);
        }}
      />
    </motion.div>
  );
};

export default LunchToday;

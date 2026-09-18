import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LuUtensils, LuUtensilsCrossed } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import LunchPickDialog from "@/components/LunchPickDialog";
import useLunchToday, { isWeekend } from "@/hooks/useLunchToday";
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

  const { data: restaurants, loading: restaurantsLoading } = useRestaurants(
    defaultRestaurantFilters
  );
  const {
    participants,
    byRestaurant,
    hasPlan,
    myRestaurantId,
    loading,
    saving,
    setLunch,
    clearLunch,
  } = useLunchToday();

  const restById = useMemo(
    () => new Map(restaurants.map((r) => [r.id, r])),
    [restaurants]
  );

  // « Inscrits » = ceux qui vont au restaurant. Déclarer qu'on ne mange pas au
  // resto est une information PRIVÉE : elle ne sert qu'à l'utilisateur (état de
  // son encart, extinction de la puce de l'onglet) et n'apparaît nulle part
  // pour les autres — ni dans le compteur, ni dans les tablées.
  const registered = useMemo(
    () => participants.filter((p) => p.restaurant_id != null),
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
  // resto » (gamelle, télétravail…) qui ne porte pas de restaurant.
  const skipsRestaurant = hasPlan && myRestaurantId == null;
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
  /** « Je ne mange pas au resto » : une intention sans restaurant. */
  const skip = () => guard(() => setLunch(null));
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
            {skipsRestaurant || weekendOff ? (
              <LuUtensilsCrossed className="h-5 w-5" />
            ) : (
              <LuUtensils className="h-5 w-5" />
            )}
          </span>
          <div className="flex h-11 min-w-0 flex-col justify-center sm:h-12">
            {skipsRestaurant ? (
              <div className="text-sm text-foreground/70">
                Ce midi, tu ne manges pas au restaurant.
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

        {/* Mobile : les boutons prennent toute la largeur sous le texte. */}
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
          ) : weekendOff ? null : (
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
                onClick={skip}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                Pas de resto
              </Button>
            </>
          )}
        </div>
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
          <p className="text-sm text-foreground/60">
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
    </motion.div>
  );
};

export default LunchToday;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LuUtensils } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import LunchPickDialog from "@/components/LunchPickDialog";
import useLunchToday from "@/hooks/useLunchToday";
import useRestaurants from "@/hooks/useRestaurants";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import { formatAuthorName } from "@/utils/authorName";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";

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
  const hasPlan = myRestaurantId != null;
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
  const leave = () => guard(() => clearLunch());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Entête : le jour + le compteur, qui « pope » à chaque arrivée. */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div
            role="heading"
            aria-level={1}
            className="font-display text-2xl font-extrabold text-foreground"
          >
            Qui déjeune où
          </div>
          <p className="mt-0.5 text-sm text-foreground/55">{todayLabel()}</p>
        </div>

        {participants.length > 0 && (
          <div className="flex shrink-0 items-baseline gap-1.5">
            <motion.span
              key={participants.length}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="font-display text-3xl font-extrabold leading-none text-primary"
            >
              {participants.length}
            </motion.span>
            <span className="text-sm text-foreground/55">
              inscrit{participants.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Mon statut du jour : appel à l'action tant que je n'ai pas choisi.
          Pendant le chargement, encart neutre (ni texte ni bouton) : c'est ce
          qui évitait de « faire clignoter » le bouton au changement d'onglet. */}
      {loading ? (
        <div className="mb-6 flex items-center gap-3 rounded-card border border-border bg-card px-5 py-4">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-foreground/10" />
          <div className="flex h-12 items-center">
            <span className="h-5 w-52 animate-pulse rounded bg-foreground/10" />
          </div>
        </div>
      ) : (
      <div
        className={cn(
          "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card px-5 py-4 transition-colors",
          hasPlan
            ? "border border-border bg-gradient-to-r from-primary/10 to-transparent"
            : "border border-dashed border-primary/40 bg-card"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              hasPlan
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            <LuUtensils className="h-5 w-5" />
          </span>
          <div className="flex h-12 min-w-0 flex-col justify-center">
            {hasPlan ? (
              <>
                <div className="text-sm text-foreground/55">
                  Ce midi, tu vas au
                </div>
                {myRestaurantName ? (
                  <div className="truncate font-display text-lg font-bold text-card-foreground">
                    {myRestaurantName}
                  </div>
                ) : (
                  <div className="mt-1 h-5 w-40 animate-pulse rounded bg-foreground/10" />
                )}
              </>
            ) : (
              <div className="text-sm text-foreground/70">
                Tu n'as pas encore choisi ton restaurant pour ce midi.
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasPlan ? (
            <Button variant="outline" onClick={leave} loading={saving}>
              Annuler
            </Button>
          ) : (
            <Button
              onClick={() => setPickOpen(true)}
              disabled={saving || restaurantsLoading}
            >
              Choisir un restaurant
            </Button>
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
          className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-card px-6 py-12 text-center"
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
        <div className="flex flex-col gap-3">
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
                    "group flex cursor-pointer select-none items-center gap-4 overflow-hidden rounded-card bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-16px_rgba(2,8,40,0.30)]",
                    mine ? "ring-2 ring-primary" : "border border-border"
                  )}
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={restaurant.image || noImage}
                      alt=""
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
                        restaurant.closed && "grayscale"
                      )}
                    />
                    {/* Nombre de convives, en pastille sur la vignette. */}
                    <motion.span
                      key={people.length}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring}
                      className="absolute bottom-1 right-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow"
                    >
                      {people.length}
                    </motion.span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-lg font-bold text-card-foreground">
                      {restaurant.name}
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex -space-x-2">
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
                                className="ring-2 ring-card"
                              />
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </span>
                      <span className="min-w-0 truncate text-xs text-foreground/55">
                        {people.map((p) => formatAuthorName(p.email)).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Rejoindre : uniquement sur les tablées où je ne suis pas
                      (la mienne se quitte depuis l'encart du haut), et jamais
                      sur un restaurant fermé entre-temps. */}
                  {!mine && !restaurant.closed && (
                    <Button
                      className="shrink-0"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        join(restaurant.id);
                      }}
                    >
                      Rejoindre
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

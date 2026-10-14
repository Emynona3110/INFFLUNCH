import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LuClock, LuMapPinOff, LuSandwich, LuUtensils, LuUtensilsCrossed } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import LunchPickDialog from "@/components/LunchPickDialog";
import LunchOffDialog from "@/components/LunchOffDialog";
import LunchDepartureDialog from "@/components/LunchDepartureDialog";
import useLunchToday, {
  formatDeparture,
  shouldAskDeparture,
  isWeekend,
  LunchOffReason,
  LunchParticipant,
} from "@/hooks/useLunchToday";
import LunchPricePrompt from "@/components/LunchPricePrompt";
import OrbitDashes from "@/components/OrbitDashes";
import RollingNumber from "@/components/RollingNumber";
import useUnpricedLunches from "@/hooks/useUnpricedLunches";
import { useLateLunchConfirm } from "@/components/LateLunchConfirm";
import useRestaurants from "@/hooks/useRestaurants";
import { defaultRestaurantFilters } from "@/pages/UserPage";
import AuthorButton from "@/components/AuthorButton";
import { toast } from "@/lib/toast";
import noImage from "@/assets/no-image-thumb.webp";
import { resizedImgProps, IMG_THUMB } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import useUserNames from "@/hooks/useUserNames";
import { SECTION_BODY } from "@/lib/sectionClasses";
import { HOVER_ZOOM_IMG } from "@/lib/imageClasses";

import { restaurantPath } from "@/utils/restaurantPath";
import { Skeleton } from "@/components/ui/skeleton";
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

// Pas d'animation `layout` sur cette page : les tuiles sont déjà déplacées par
// le flux quand la relance ouvre ou referme sa hauteur. Leur en donner une
// ajoutait un second ressort sur le même mouvement, et toute la page
// tremblait. Le flux suffit, et il ne peut pas se désaccorder avec lui-même.

/**
 * Relance : les deux temps ne se jouent jamais ensemble.
 *
 * À l'ouverture, la hauteur se fait d'abord — les tuiles du dessous s'écartent
 * sur un bloc encore invisible — et le contenu n'apparaît qu'une fois la place
 * prise. À la fermeture, l'inverse : il s'efface, puis la page se referme.
 *
 * En CSS (grille 0fr → 1fr) et non en hauteur « auto » animée par
 * framer-motion : celle-ci mesure le bloc déplié avant d'animer, et la page
 * clignotait à l'apparition. Courbe lent-rapide-lent : ce sont les tuiles du
 * dessous qu'on regarde glisser, elles démarrent et s'arrêtent en douceur.
 */
const PROMPT_ROWS_OPEN =
  "grid-rows-[1fr] duration-[340ms] ease-[cubic-bezier(0.65,0,0.35,1)]";
const PROMPT_ROWS_CLOSED =
  "grid-rows-[0fr] delay-[180ms] duration-[340ms] ease-[cubic-bezier(0.65,0,0.35,1)]";
const PROMPT_FADE_OPEN = "opacity-100 delay-[340ms] duration-[180ms]";
const PROMPT_FADE_CLOSED = "opacity-0 duration-[180ms]";

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
}) => {
  const { nameOf } = useUserNames();
  return (
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
                <span className="sm:hidden">{nameOf(p.email)}</span>
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
};

/**
 * Section « Déjeuner » : qui déjeune où aujourd'hui. Il n'y a ni organisateur ni
 * invitation — chacun déclare son restaurant du jour et les tablées se forment
 * par regroupement. La liste se met à jour en direct (Realtime) ; les arrivées
 * et départs se font en fondu, sans animation de position (les cartes ne
 * glissent pas). On choisit et on annule depuis l'encart du haut ; les tablées
 * portent un bouton « Rejoindre » (sauf la mienne) et mènent à la fiche.
 */
const LunchToday = () => {
  const { nameOf } = useUserNames();
  const navigate = useNavigate();
  const [pickOpen, setPickOpen] = useState(false);
  const [offOpen, setOffOpen] = useState(false);
  const [departureOpen, setDepartureOpen] = useState(false);

  const { data: restaurants, loading: restaurantsLoading } = useRestaurants(
    defaultRestaurantFilters
  );
  const {
    participants,
    byRestaurant,
    hasPlan,
    myRestaurantId,
    myOffReason,
    myDeparture,
    loading,
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

  // Icône de l'encart. Dérivée une fois, avec une clé : c'est elle qui permet
  // de fondre une icône dans l'autre au changement d'état.
  const statusIcon = awayToday
    ? { key: "away", Icon: LuMapPinOff }
    : skipsRestaurant
      ? { key: "on-site", Icon: LuSandwich }
      : weekendOff
        ? { key: "weekend", Icon: LuUtensilsCrossed }
        : { key: "open", Icon: LuUtensils };

  // Prix à réclamer : LA relance en cours, gardée jusqu'à être complétée,
  // refusée ou remplacée par celle d'un midi plus récent (règle dans
  // useUnpricedLunches). Un restaurant absent de la
  // liste (supprimé, ou « test » pour un non-admin) est ignoré : c'est lui qui
  // porte les montants proposés.
  const { lunches: unpricedLunches, skip: skipPriceAsk } = useUnpricedLunches();
  const priceToAsk = useMemo(() => {
    for (const lunch of unpricedLunches) {
      const restaurant = restById.get(lunch.restaurantId);
      if (restaurant) return { restaurant, day: lunch.day };
    }
    return null;
  }, [unpricedLunches, restById]);

  // La relance reste rendue pendant son repli : on garde la dernière affichée
  // (mise à jour pendant le rendu, pas dans un effet, sinon une image de
  // retard). Elle change de contenu sans se replier si une autre la remplace.
  const priceOpen = !loading && priceToAsk != null;
  const priceKey = priceToAsk && `${priceToAsk.restaurant.id}-${priceToAsk.day}`;
  const [shownPrice, setShownPrice] = useState(priceToAsk);
  const shownKey = shownPrice && `${shownPrice.restaurant.id}-${shownPrice.day}`;
  if (priceToAsk && priceKey !== shownKey) setShownPrice(priceToAsk);

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

  // Passé 14 h, écraser un midi déjà déclaré demande confirmation : à cette
  // heure-là c'est presque toujours le pouce qui a ripé (« Rejoindre » est sur
  // chaque tablée), et tout retirer coupe la série de midis déclarés.
  const { confirmLateChange, lateLunchDialog } = useLateLunchConfirm();

  // Une fois la tablée créée ou rejointe, on demande l'heure de départ — sauf
  // passé 14 h, où le midi est déjà joué. Écriture optimiste : la popup
  // s'ouvre sans attendre le serveur, et se referme s'il refuse (la tablée
  // est alors rétablie par le hook).
  const join = (restaurantId: number) =>
    confirmLateChange("switch", hasPlan, () => {
      if (shouldAskDeparture()) setDepartureOpen(true);
      return guard(() =>
        setLunch(restaurantId).catch((e) => {
          setDepartureOpen(false);
          throw e;
        })
      );
    });
  /** « Je ne mange pas au resto », en disant lequel des deux cas. */
  const skip = (reason: LunchOffReason) =>
    confirmLateChange("off", hasPlan, () => guard(() => setLunchOff(reason)));
  const leave = () => confirmLateChange("clear", hasPlan, () => guard(() => clearLunch()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Entête : le jour + le compteur, qui « pope » à chaque arrivée. */}
      {/* `items-baseline-last` : le compteur s'aligne sur la DERNIÈRE ligne de
          gauche (la date), pas sur le titre. */}
      <div className="mb-2.5 flex items-baseline-last justify-between gap-4 sm:mb-5">
        <div>
          <div
            role="heading"
            aria-level={1}
            className="font-display text-lg font-bold text-foreground sm:text-2xl"
          >
            Qui déjeune où
          </div>
          <p className="mb-0 mt-0.5 text-[13px] text-foreground/55 sm:text-sm">{todayLabel()}</p>
        </div>

        {/* Alignés sur la ligne de base de la date. `overflow-clip` et non
            `overflow-hidden` pour rogner le défilé du chiffre : une boîte
            `hidden` pose sa ligne de base sur son bord bas (le chiffre
            remontait de la hauteur de sa descente), `clip` garde celle du texte. */}
        {registered.length > 0 && (
          <div className="flex shrink-0 items-baseline gap-1.5">
            <RollingNumber
              value={registered.length}
              className="overflow-clip font-display text-2xl font-bold leading-none text-primary sm:text-3xl"
            />
            <span className="text-sm leading-none text-foreground/55">
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
        // Desktop : UNE SEULE LIGNE, quel que soit l'état (`sm:flex-nowrap`).
        // Les boutons passaient à la ligne quand le texte était long (« Tu n'as
        // pas encore choisi… » + deux boutons), et l'encart changeait de
        // hauteur d'un état à l'autre : mieux vaut supprimer le
        // redimensionnement que l'animer. Le groupe de boutons garde sa taille
        // (`shrink-0`), c'est le texte qui se partage ce qui reste — sa boîte
        // fait déjà deux lignes de haut (h-12), il y tient.
        className="relative mb-3 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5 rounded-card bg-card px-3 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-5 sm:py-4"
      >
        {/* Les trois habillages de l'encart (attente, choisi, week-end) sont
            des COUCHES superposées dont on croise l'opacité, et non des
            classes qu'on échange : un `bg-gradient` est une image de fond, elle
            ne se transitionne pas en CSS — le fond sautait d'un état à l'autre.
            Chaque couche porte sa bordure complète, donc le conteneur n'en a
            aucune : deux bordures superposées se verraient l'une derrière
            l'autre. */}
        {[
          {
            // En attente d'un choix : des points qui tournent lentement, bien
            // plus visibles qu'un pointillé figé. Ils ne prennent pas de place
            // (tracé en position absolue), la couche n'a donc pas de bordure.
            key: "waiting",
            on: !hasPlan && !weekendOff,
            className: "",
            content: <OrbitDashes />,
          },
          {
            key: "neutral",
            on: weekendOff,
            className: "border border-border",
            content: null,
          },
          {
            key: "chosen",
            on: hasPlan,
            className:
              "border border-border bg-gradient-to-r from-primary/10 to-transparent",
            content: null,
          },
        ].map((layer) => (
          <motion.span
            key={layer.key}
            aria-hidden
            initial={false}
            animate={{ opacity: layer.on ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "pointer-events-none absolute inset-0 rounded-card",
              layer.className
            )}
          >
            {layer.content}
          </motion.span>
        ))}
        <div className="relative flex min-w-0 items-center gap-3">
          <span
            className={cn(
              // Fond et couleur d'icône, eux, se transitionnent très bien en
              // CSS : le bleu pâle vire au bleu plein sans palier.
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:h-10 sm:w-10",
              hasPlan
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {/* L'icône, elle, est remplacée : couverts, couverts croisés,
                sandwich, point barré. Un fondu court évite le clignotement. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={statusIcon.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex"
              >
                <statusIcon.Icon className="h-5 w-5" />
              </motion.span>
            </AnimatePresence>
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
                    {myDeparture && (
                      <span className="font-sans text-sm font-semibold text-primary">
                        {" "}· {formatDeparture(myDeparture)}
                      </span>
                    )}
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
          <div className="relative flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {/* « Retirer » remplace « Choisir / Pas de resto » : `mode="wait"`
                pour que les deux jeux ne se chevauchent pas, et un fondu court
                — c'est un bouton sous le doigt, pas une tuile. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={hasPlan ? "cancel" : "choose"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex w-full items-center gap-2 sm:w-auto"
              >
                {hasPlan ? (
                  <>
                    {/* L'heure de départ se change ici à tout moment. */}
                    {myRestaurantId != null && (
                      <Button
                        variant="outline"
                        onClick={() => setDepartureOpen(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <LuClock className="h-4 w-4" />
                        Heure
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={leave}
                      className="flex-1 sm:flex-none"
                    >
                      Retirer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setPickOpen(true)}
                      disabled={restaurantsLoading}
                      className="flex-1 sm:flex-none"
                    >
                      <span className="sm:hidden">Choisir</span>
                      <span className="hidden sm:inline">
                        Choisir un restaurant
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOffOpen(true)}
                      className="flex-1 sm:flex-none"
                    >
                      Pas de resto
                    </Button>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
      )}

      {/* Une fois le déjeuner passé, la question n'est plus « où vas-tu » mais
          « combien ça a coûté ». On rattrape aussi les midis des jours
          précédents : beaucoup ne repassent que le lendemain. Une seule
          relance à la fois, la plus récente — la suivante prendra sa place une
          fois celle-ci traitée. */}
      {/* `overflow-hidden` sur le bloc intérieur : la grille rogne la relance
          pendant qu'elle s'ouvre, marge basse comprise (le dépassement crée un
          contexte de formatage, la marge ne s'échappe pas). Les tuiles du
          dessous suivent le flux, en glissant. `inert` une fois repliée. */}
      <div
        inert={!priceOpen}
        className={cn(
          "grid transition-[grid-template-rows]",
          priceOpen ? PROMPT_ROWS_OPEN : PROMPT_ROWS_CLOSED
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity",
            priceOpen ? PROMPT_FADE_OPEN : PROMPT_FADE_CLOSED
          )}
        >
          {shownPrice && (
            <LunchPricePrompt
              key={shownKey}
              restaurant={shownPrice.restaurant}
              day={shownPrice.day}
              onSkip={() => skipPriceAsk(shownPrice.restaurant.id)}
            />
          )}
        </div>
      </div>

      {/* Tablées du jour. */}
      {loading ? (
        // Tablées en chargement : mêmes lignes (vignette, nom, participants,
        // bouton Rejoindre) que les vraies.
        <div
          className={cn(SECTION_BODY, "divide-y divide-border sm:flex sm:flex-col sm:gap-3 sm:divide-y-0")}
          role="status"
          aria-label="Chargement des tablées"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 sm:gap-4 sm:rounded-card sm:border sm:border-border sm:bg-card sm:p-3"
            >
              <Skeleton className="h-12 w-16 shrink-0 rounded-lg sm:h-16 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40 sm:h-6 sm:w-56" />
                <Skeleton className="h-3.5 w-28 sm:h-6 sm:w-40" />
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-28 sm:rounded-lg" />
            </div>
          ))}
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
              // Heures de départ de la tablée, chacune une fois, dans l'ordre
              // de la journée. Aucune ligne si personne n'en a donné.
              const departures = [
                ...new Set(
                  people.flatMap((p) => (p.departure_time ? [p.departure_time] : []))
                ),
              ].sort();
              return (
                <motion.article
                  key={restaurant.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(restaurantPath(restaurant.slug))}
                  className={cn(
                    "group flex cursor-pointer select-none items-center gap-3 overflow-hidden p-2.5 transition sm:rounded-card sm:bg-card sm:gap-4 sm:p-3 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_14px_34px_-16px_rgba(2,8,40,0.30)]",
                    // Ma tablée : fond teinté sur mobile, anneau sur desktop.
                    // Elle garde une bordure (transparente) : sans elle, elle
                    // mesurait 2 px de moins que les autres — l'anneau est une
                    // ombre, il ne prend pas de place — et rejoindre une
                    // tablée décalait la liste.
                    mine
                      ? "bg-primary/5 sm:border sm:border-transparent sm:bg-card sm:ring-2 sm:ring-primary"
                      : "sm:border sm:border-border"
                  )}
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-24">
                    <img
                      loading="lazy"
                      data-fade
                      {...resizedImgProps(restaurant.image || noImage, IMG_THUMB)}
                      alt=""
                      className={cn(
                        HOVER_ZOOM_IMG,
                        restaurant.closed && "grayscale"
                      )}
                    />
                    {/* Nombre de convives, en pastille sur la vignette. */}
                    {/* Même molette que le compteur d'inscrits : on voit
                        qu'un convive arrive ou s'en va. */}
                    <span className="absolute bottom-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow sm:bottom-1 sm:right-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs">
                      <RollingNumber value={people.length} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Nom du resto | heures de départ : c'est le nom qui se
                        tronque, les heures restent lisibles en entier. */}
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-display text-base font-bold sm:text-lg text-card-foreground">
                        {restaurant.name}
                      </span>
                      {departures.length > 0 && (
                        <span className="shrink-0 whitespace-nowrap text-xs text-foreground/55 sm:text-sm">
                          <span aria-hidden className="mr-2 text-foreground/25">|</span>
                          {departures.length > 1 ? "Départs" : "Départ"} :{" "}
                          <span className="font-semibold text-card-foreground">
                            {departures.map(formatDeparture).join(", ")}
                          </span>
                        </span>
                      )}
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
                            <span className="sm:hidden">{nameOf(p.email)}</span>
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

      <LunchDepartureDialog
        open={departureOpen}
        onClose={() => setDepartureOpen(false)}
        restaurantId={myRestaurantId}
      />

      {lateLunchDialog}
    </motion.div>
  );
};

export default LunchToday;

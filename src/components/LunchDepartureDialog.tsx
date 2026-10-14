import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuChevronDown, LuChevronUp, LuClock } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import useLunchToday, {
  formatDeparture,
} from "@/hooks/useLunchToday";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tablée que je viens de créer ou de rejoindre. */
  restaurantId: number | null;
}

/** Heure proposée par défaut, la plus courante au bureau. */
const DEFAULT_DEPARTURE = "12:00";

/** Bornes du sélecteur, en minutes depuis minuit (11 h 30 – 14 h). */
const MIN = 11 * 60 + 30;
const MAX = 14 * 60;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Lent, rapide, lent : même courbe que les relances de la page du midi. */
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Une colonne du sélecteur : chevron haut, valeur, chevron bas. La valeur
 *  défile comme une molette, dans le sens du chevron pressé. */
const Spinner = ({
  value,
  dir,
  label,
  onStep,
  canUp,
  canDown,
}: {
  value: string;
  /** Sens du dernier pas : 1 = plus tard (défile vers le haut). */
  dir: 1 | -1;
  label: string;
  onStep: (dir: 1 | -1) => void;
  canUp: boolean;
  canDown: boolean;
}) => {
  const chevron =
    "flex h-9 w-14 cursor-pointer items-center justify-center rounded-lg text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={`${label} : plus tard`}
        disabled={!canUp}
        onClick={() => onStep(1)}
        className={chevron}
      >
        <LuChevronUp className="h-5 w-5" />
      </button>
      {/* `custom` sur AnimatePresence : la valeur sortante part dans le sens
          du pas en cours, pas dans celui du précédent (cf. RollingNumber). */}
      <span className="relative flex h-12 w-16 items-center justify-center overflow-hidden font-display text-4xl font-bold tabular-nums text-card-foreground">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            variants={{
              enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center: { y: "0%", opacity: 1 },
              exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: EASE_IN_OUT }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        aria-label={`${label} : plus tôt`}
        disabled={!canDown}
        onClick={() => onStep(-1)}
        className={chevron}
      >
        <LuChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
};

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    // Même grammaire que PriceQuickPicks : pleine à la sélection, creuse au repos.
    className={cn(
      "inline-flex cursor-pointer items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold leading-none tabular-nums transition",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-foreground/80 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
    )}
  >
    {children}
  </button>
);

/**
 * « À quelle heure pars-tu ? », posé juste après avoir créé ou rejoint une
 * tablée. Un tap suffit : « Je ne sais pas », midi, ou l'une des heures déjà
 * données par la tablée — c'est elle qu'on veut rejoindre, pas une horloge.
 * « Autre heure » déplie un sélecteur à chevrons (heure / minutes par 15 min,
 * de 11 h 30 à 14 h).
 *
 * Le restaurant est déjà enregistré quand la popup s'ouvre : la fermer revient
 * à répondre « je ne sais pas » (ou à garder l'heure d'avant).
 */
const LunchDepartureDialog = ({ open, onClose, restaurantId }: Props) => {
  const { byRestaurant, myDeparture, previousDeparture, setDeparture } =
    useLunchToday();
  const [showAll, setShowAll] = useState(false);
  // Heure affichée par le sélecteur, en minutes depuis minuit.
  const [minutes, setMinutes] = useState(toMinutes(DEFAULT_DEPARTURE));
  const [dir, setDir] = useState<1 | -1>(1);
  const step = (delta: number) => {
    setDir(delta > 0 ? 1 : -1);
    setMinutes((m) => Math.min(MAX, Math.max(MIN, m + delta)));
  };

  // À chaque ouverture : sélecteur replié, calé sur mon heure (ou midi).
  // Remis à zéro PENDANT le rendu et non dans un effet : l'effet passe après
  // un premier affichage encore déplié, et la popup rouverte jouait le
  // repli de la fois précédente.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setShowAll(false);
      setMinutes(toMinutes(myDeparture ?? DEFAULT_DEPARTURE));
    }
  }

  // Les heures de la tablée (les autres), midi, la mienne, et celle que
  // j'avais dans ma tablée précédente : chacune une fois, dans l'ordre de la journée.
  const quick = useMemo(() => {
    const table = restaurantId != null ? byRestaurant.get(restaurantId) ?? [] : [];
    const times = new Set<string>([DEFAULT_DEPARTURE]);
    table.forEach((p) => p.departure_time && times.add(p.departure_time));
    if (myDeparture) times.add(myDeparture);
    // Mon heure d'avant le changement de tablée.
    if (previousDeparture) times.add(previousDeparture);
    return [...times].sort();
  }, [byRestaurant, restaurantId, myDeparture, previousDeparture]);

  const pick = (time: string | null) => {
    onClose();
    if (time === myDeparture) return;
    setDeparture(time).catch((e) =>
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : String(e),
        status: "error",
        duration: 5000,
      })
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-md overflow-hidden"
      closeOnOverlayClick
      showClose
    >
      <DialogTitle>
        <span className="mr-8 flex items-center gap-2">
          <LuClock className="h-5 w-5 shrink-0 text-primary" />
          À quelle heure pars-tu ?
        </span>
      </DialogTitle>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Jamais mise en avant : « je ne sais pas » est l'état par défaut,
            pas un choix à souligner. */}
        <Pill active={false} onClick={() => pick(null)}>
          Je ne sais pas
        </Pill>
        {quick.map((time) => (
          <Pill
            key={time}
            active={myDeparture === time}
            onClick={() => pick(time)}
          >
            {formatDeparture(time)}
          </Pill>
        ))}
        {/* Toujours en place, simplement effacé une fois le sélecteur ouvert :
            le retirer du flux faisait bouger les pastilles, et le fondu de
            framer-motion se battait avec la transition CSS du bouton. */}
        <button
          type="button"
          tabIndex={showAll ? -1 : undefined}
          aria-hidden={showAll}
          onClick={() => setShowAll(true)}
          className={cn(
            "cursor-pointer text-sm font-medium text-primary underline-offset-2 transition-opacity duration-150 hover:underline",
            showAll && "pointer-events-none opacity-0"
          )}
        >
          Autre heure
        </button>
      </div>

      {/* Autre heure : chevrons sur l'heure et sur les minutes (tranches de
          15 min). Une heure qui sortirait de la plage est ramenée à la borne
          (13h30 + 1 h → 14h). */}
      {/* Ouverture du sélecteur : la popup s'agrandit d'abord, le contenu
          apparaît ensuite. En CSS (grille 0fr → 1fr) et non en hauteur
          « auto » animée par framer-motion : celle-ci mesure le bloc déplié
          pendant une image, et la popup, centrée verticalement, sautait à sa
          taille finale avant de repartir — le clignotement. Le bloc est
          toujours monté, `inert` le sort du clavier tant qu'il est replié. */}
      <div
        inert={!showAll}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]",
          showAll ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity",
            showAll ? "opacity-100 delay-200 duration-200" : "opacity-0 duration-0"
          )}
        >
            <div className="mt-5 flex flex-col items-center gap-4 border-t border-border pb-1 pt-5">
              <div aria-live="polite" className="flex items-center gap-1">
                <Spinner
                  label="Heure"
                  value={String(Math.floor(minutes / 60))}
                  dir={dir}
                  canUp={minutes < MAX}
                  canDown={minutes > MIN}
                  onStep={(d) => step(d * 60)}
                />
                <span className="pb-1 font-display text-4xl font-bold text-foreground/40">
                  :
                </span>
                <Spinner
                  label="Minutes"
                  value={String(minutes % 60).padStart(2, "0")}
                  dir={dir}
                  canUp={minutes < MAX}
                  canDown={minutes > MIN}
                  onStep={(d) => step(d * 15)}
                />
              </div>
              <Button onClick={() => pick(toTime(minutes))}>Valider</Button>
            </div>
        </div>
      </div>
    </Dialog>
  );
};

export default LunchDepartureDialog;

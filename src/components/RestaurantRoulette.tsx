import { ComponentProps, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { LuDices } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import RestaurantCardTW from "@/components/RestaurantCardTW";
import RouletteSelectionDialog from "@/components/RouletteSelectionDialog";
import { Restaurant } from "@/hooks/useRestaurants";
import useAchievements from "@/hooks/useAchievements";
import noImage from "@/assets/no-image.jpg";

const ITEM_H = 88; // hauteur d'une ligne de la roulette (px)
const SLOT_H = 360; // hauteur réservée = taille d'une tuile (boutons stables)
const RING_TOP = (SLOT_H - ITEM_H) / 2; // anneau de sélection centré verticalement
const SPIN_LEN = 40; // nombre de vignettes défilantes avant le gagnant
const SPIN_DURATION = 4.6; // durée du défilement (s)
const RECENT_KEY = "rouletteRecent";
const RECENT_MAX = 3; // on évite de retomber sur les N derniers tirés

// Nombre de lancers depuis le chargement de la page (succès « Indécis »).
// Volontairement au niveau module : conservé au changement de vue, remis à zéro
// au rechargement complet de la page.
let sessionSpinCount = 0;

const readRecent = (): number[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
};

const pushRecent = (id: number) => {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage indisponible */
  }
};

/** Tirage uniforme, en excluant si possible les derniers restos déjà tirés. */
const pickWinner = (pool: Restaurant[]): Restaurant => {
  const recent = readRecent();
  let candidates = pool.filter((r) => !recent.includes(r.id));
  if (candidates.length === 0) candidates = pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * Construit le ruban défilant : SPIN_LEN vignettes aléatoires, le gagnant, puis
 * une de plus. On évite les doublons consécutifs tant que le pool a >1 resto.
 */
const buildReel = (pool: Restaurant[], winner: Restaurant) => {
  const pick = (avoidId: number) => {
    if (pool.length === 1) return pool[0];
    let r = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (r.id === avoidId && guard++ < 20) {
      r = pool[Math.floor(Math.random() * pool.length)];
    }
    return r;
  };

  const reel: Restaurant[] = [];
  for (let i = 0; i < SPIN_LEN; i++) {
    reel.push(pick(reel.length ? reel[reel.length - 1].id : -1));
  }
  if (reel.length && reel[reel.length - 1].id === winner.id) {
    reel[reel.length - 1] = pick(winner.id);
  }
  const winnerIndex = reel.length;
  reel.push(winner);
  // Assez de vignettes sous le gagnant pour remplir le bas de la fenêtre.
  reel.push(pick(winner.id));
  reel.push(pick(reel[reel.length - 1].id));
  return { reel, winnerIndex };
};

const ReelRow = ({ resto }: { resto: Restaurant }) => (
  <div className="flex items-center gap-3 px-7" style={{ height: ITEM_H }}>
    <img
      src={resto.image || noImage}
      alt=""
      className="h-16 w-20 shrink-0 rounded-lg object-cover"
    />
    <div className="min-w-0 flex-1 truncate font-display text-lg font-bold text-card-foreground">
      {resto.name}
    </div>
  </div>
);

interface RestaurantRouletteProps {
  /** Restos filtrés (respecte filtres + favoris). */
  pool: Restaurant[];
  /** Ids exclus de la roue, mémorisés au niveau page (survivent au changement de vue). */
  excludedIds: Set<number>;
  onExcludedChange: (next: Set<number>) => void;
  /** Dernier resto tiré (mémorisé au niveau page), null si aucun. */
  winnerId: number | null;
  onWinnerChange: (id: number | null) => void;
  /** Fabrique les props de la carte (favoris/top/édition) — vient de la grille. */
  cardProps: (r: Restaurant) => ComponentProps<typeof RestaurantCardTW>;
}

/**
 * Vue « roue » plein écran (mode d'affichage à part entière). La roue tourne
 * au clic sur « Lancer » ; la sélection des restos participants se fait via une
 * popup. Le dernier tirage est mémorisé au niveau page.
 */
const RestaurantRoulette = ({
  pool,
  excludedIds,
  onExcludedChange,
  winnerId,
  onWinnerChange,
  cardProps,
}: RestaurantRouletteProps) => {
  const { unlock } = useAchievements();
  const [spinKey, setSpinKey] = useState(0);
  // idle = en attente du clic « Lancer » ; result à l'arrivée si un tirage est
  // déjà mémorisé (retour sur la vue). Pas de tirage automatique.
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">(
    winnerId != null ? "result" : "idle"
  );
  const [selectionOpen, setSelectionOpen] = useState(false);

  const selectedPool = useMemo(
    () => pool.filter((r) => !excludedIds.has(r.id)),
    [pool, excludedIds]
  );

  // Le gagnant mémorisé (retrouvé dans le pool courant).
  const resolvedWinner =
    winnerId != null ? pool.find((r) => r.id === winnerId) : undefined;

  const spin = useMemo(() => {
    if (selectedPool.length === 0) return null;
    const winner = pickWinner(selectedPool);
    return { winner, ...buildReel(selectedPool, winner) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPool, spinKey]);

  const targetY = spin ? RING_TOP - spin.winnerIndex * ITEM_H : 0;
  const rolling = phase === "spinning";

  // Un seul resto possible (filtres) : pas de roue, on l'affiche directement.
  const single = pool.length === 1 ? pool[0] : null;

  const launch = () => {
    // Succès « Dé pipé » : lancer avec un seul resto, réduit volontairement
    // (d'autres restos existent mais ont été décochés).
    if (selectedPool.length === 1 && pool.length > 1) unlock("de_pipe");
    // Succès « Indécis » : 5 lancers dans la même session (secret).
    sessionSpinCount += 1;
    if (sessionSpinCount >= 5) unlock("indecis");

    setSpinKey((k) => k + 1);
    setPhase("spinning");
  };

  return (
    <div className="tw-scope flex h-full flex-col items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Zone d'affichage à hauteur fixe (taille d'une tuile) → les boutons
            ne bougent pas entre attente / défilement / résultat. */}
        <div
          className="flex items-center justify-center"
          style={{ height: SLOT_H }}
        >
        {single ? (
          // ---- Un seul resto correspond aux filtres : affiché directement ----
          <motion.div
            key={single.id}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full"
          >
            <RestaurantCardTW {...cardProps(single)} />
          </motion.div>
        ) : selectedPool.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-8 text-center text-sm text-foreground/60">
            Aucun restaurant sélectionné pour la roue. Ouvre
            <span className="font-medium text-foreground"> Modifier la sélection </span>
            pour en cocher.
          </p>
        ) : phase === "result" && resolvedWinner ? (
          // ---- Résultat : la tuile du gagnant (même style que la grille) ----
          <motion.div
            key={resolvedWinner.id}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full"
          >
            <RestaurantCardTW {...cardProps(resolvedWinner)} />
          </motion.div>
        ) : phase === "spinning" && spin ? (
          // ---- Défilement machine à sous ----
          <div
            className="relative w-full overflow-hidden rounded-card border border-border bg-muted/40"
            style={{ height: SLOT_H }}
          >
            {/* Zone de sélection : deux rails fins qui s'estompent sur les côtés
                et deux chevrons qui pointent la ligne gagnante (pas de cadre). */}
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: RING_TOP, height: ITEM_H }}
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <FiChevronRight className="absolute left-1.5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
              <FiChevronLeft className="absolute right-1.5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
            </div>
            {/* Dégradés haut/bas pour l'effet de profondeur */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-card to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-card to-transparent" />

            <motion.div
              key={spinKey}
              initial={{ y: 0 }}
              animate={{ y: targetY }}
              transition={{ duration: SPIN_DURATION, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={() => {
                pushRecent(spin.winner.id);
                onWinnerChange(spin.winner.id);
                setPhase("result");
                // Succès « Gambling » : un tirage est allé au bout.
                unlock("gambling");
              }}
            >
              {spin.reel.map((resto, i) => (
                <ReelRow key={i} resto={resto} />
              ))}
            </motion.div>
          </div>
        ) : (
          // ---- En attente : invite à lancer la roue (taille d'une tuile) ----
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-card px-6 text-center">
            <LuDices className="h-10 w-10 text-primary" />
            <p className="text-sm text-foreground/60">
              Clique sur{" "}
              <span className="font-medium text-foreground">Lancer</span> pour
              tirer un restaurant au hasard.
            </p>
          </div>
        )}
        </div>

        {single ? (
          // Un seul resto possible : ni sélection ni tirage.
          <p className="mt-4 flex min-h-10 items-center justify-center text-center text-sm text-foreground/60">
            Un seul restaurant correspond aux filtres.
          </p>
        ) : (
          /* Actions : désactivées pendant le défilement. */
          <div className="mt-4 flex items-stretch gap-2">
            <Button
              variant="outline"
              className="h-auto min-h-10 flex-1 px-2 py-1.5 leading-tight"
              disabled={rolling}
              onClick={() => setSelectionOpen(true)}
            >
              Modifier la sélection
            </Button>
            <Button
              className="h-auto min-h-10 flex-1 px-2 py-1.5 leading-tight"
              disabled={rolling || selectedPool.length === 0}
              onClick={launch}
            >
              Lancer
            </Button>
          </div>
        )}
      </div>

      <RouletteSelectionDialog
        open={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        pool={pool}
        excludedIds={excludedIds}
        onExcludedChange={onExcludedChange}
        onConfirm={() => {
          setSelectionOpen(false);
          launch();
        }}
      />
    </div>
  );
};

export default RestaurantRoulette;

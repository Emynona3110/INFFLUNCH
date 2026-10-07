import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
  /** Ce qui défile, à la place du nombre lui-même : `value` ne sert alors
   *  qu'à identifier la valeur et à donner le sens (ex. le mois du
   *  classement, rendu par son nom). */
  children?: React.ReactNode;
}

/** Même courbe que les glissements de la page du midi : lent, rapide, lent.
 *  Une molette de cadenas part et s'arrête en douceur, sans rebond. */
const ROLL = {
  duration: 0.3,
  ease: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

/**
 * Nombre qui défile verticalement comme la molette d'un cadenas : il monte
 * quand il augmente, descend quand il diminue. Le sens porte l'information —
 * on voit qu'un convive est arrivé sans avoir lu le chiffre.
 *
 * `tabular-nums` : sans chasse fixe, passer de 1 à 2 décalerait le mot qui
 * suit, le défilé donnerait l'impression de bouger latéralement.
 */
const RollingNumber = ({ value, className, children }: Props) => {
  // Le sens est FIGÉ au changement de valeur, et seulement là. Le recalculer
  // à chaque rendu (valeur ≥ précédente) le remettait à « monte » au premier
  // rendu suivant — un parent qui se re-rend pendant le défilement — et le
  // chiffre sortant repartait en sens inverse en pleine course.
  const previous = useRef(value);
  const up = useRef(true);
  if (value !== previous.current) {
    up.current = value > previous.current;
    previous.current = value;
  }
  const goingUp = up.current;

  return (
    // `overflow-hidden` : le chiffre qui part et celui qui arrive sont hors de
    // la fenêtre, on ne voit que celui qui passe.
    <span
      className={cn(
        "relative inline-flex overflow-hidden tabular-nums",
        className
      )}
    >
      {/* Le sens passe par `custom` et des variantes, et non par des valeurs
          écrites dans `exit` : un élément qui s'en va garde les props de son
          dernier rendu, il serait sorti dans le sens du changement PRÉCÉDENT.
          `custom` posé sur AnimatePresence est, lui, transmis aux sortants.
          popLayout : le chiffre sortant quitte le flux, celui qui entre prend
          tout de suite sa place — sans quoi les deux s'additionneraient en
          largeur le temps du passage. */}
      <AnimatePresence initial={false} mode="popLayout" custom={goingUp}>
        <motion.span
          key={value}
          custom={goingUp}
          variants={{
            enter: (up: boolean) => ({ y: up ? "100%" : "-100%" }),
            center: { y: "0%" },
            exit: (up: boolean) => ({ y: up ? "-100%" : "100%" }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={ROLL}
        >
          {children ?? value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RollingNumber;

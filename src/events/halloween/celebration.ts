import { useSyncExternalStore } from "react";

/** Délai avant la fenêtre du trophée : le temps de la prise du 4e bonbon
 *  (CandyGrab, 1,1 s). */
const AFTER_GRAB_MS = 1150;

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Ouvre la fenêtre du trophée (tout de suite par défaut). */
export const openCelebration = () => {
  open = true;
  emit();
};

/** Le 4e bonbon est pris : la fenêtre du trophée s'ouvrira après sa prise. */
export const celebrate = () => {
  window.setTimeout(openCelebration, AFTER_GRAB_MS);
};

export const closeCelebration = () => {
  open = false;
  emit();
};

export const useCelebration = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );

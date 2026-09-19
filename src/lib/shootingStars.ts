// Easter egg « Shooting Stars » (Bag Raiders) : curseur étoile + traînée
// d'étoiles filantes, actif tant que la page n'est pas rechargée. État au
// niveau module (survit à la navigation React Router, meurt au reload).

let active = false;
const listeners = new Set<(on: boolean) => void>();

export const isShootingStarsActive = () => active;

export const toggleShootingStars = () => {
  active = !active;
  listeners.forEach((fn) => fn(active));
  return active;
};

export const subscribeShootingStars = (fn: (on: boolean) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

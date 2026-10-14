/**
 * Monogramme de chargement plein écran : UN SEUL élément pour toute la vie de
 * la page, le #boot-loader d'index.html (hors de #root, React n'y touche pas).
 * Les écrans d'attente ne dessinent plus leur propre monogramme : ils le
 * réclament (`acquire`) et le rendent (`release`). Son animation ne repart
 * donc jamais du début quand un écran d'attente en relaie un autre
 * (démarrage → connexion → page → onglet) — elle se coupait et reprenait.
 */

// Même délai et même fondu que PageLoader et que l'apparition au démarrage.
const DELAY_MS = 1000;
// Un écran d'attente qui disparaît est souvent aussitôt relayé par un autre
// (même rendu React) : on attend un instant avant de masquer.
const HANDOFF_MS = 60;

// Le démarrage compte comme une demande, rendue après le premier rendu de
// l'app (cf. `releaseBoot`).
let count = 1;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let detached = false;

const el = () => document.getElementById("boot-loader");

/** Sort l'élément de son animation CSS de démarrage, à l'opacité où il en
 *  est : la suite passe par des transitions pilotées d'ici. */
const detach = (node: HTMLElement) => {
  if (detached) return;
  detached = true;
  node.style.opacity = getComputedStyle(node).opacity;
  node.classList.remove("booting");
};

const setVisible = (visible: boolean) => {
  const node = el();
  if (!node) return;
  detach(node);
  node.style.opacity = visible ? "1" : "0";
  // Masqué : plus annoncé comme « Chargement » aux lecteurs d'écran.
  node.toggleAttribute("aria-hidden", !visible);
};

const scheduleShow = () => {
  clearTimeout(hideTimer);
  hideTimer = undefined;
  const node = el();
  // Démarrage : l'animation CSS le fait déjà apparaître au bon moment. Déjà
  // visible, ou apparition programmée : rien à faire.
  if (!node || !detached || showTimer || node.style.opacity === "1") return;
  showTimer = setTimeout(() => {
    showTimer = undefined;
    setVisible(true);
  }, DELAY_MS);
};

const scheduleHide = () => {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (count > 0) return;
    clearTimeout(showTimer);
    showTimer = undefined;
    setVisible(false);
  }, HANDOFF_MS);
};

export const acquireScreenLoader = () => {
  count += 1;
  scheduleShow();
};

export const releaseScreenLoader = () => {
  count = Math.max(0, count - 1);
  if (count === 0) scheduleHide();
};

let bootReleased = false;
/** Fin du démarrage : à appeler une fois l'app montée. Si aucun écran
 *  d'attente n'a pris le relais (page de connexion…), le monogramme s'efface. */
export const releaseBoot = () => {
  if (bootReleased) return;
  bootReleased = true;
  releaseScreenLoader();
};

/**
 * Monogramme de chargement plein écran : UN SEUL élément pour toute la vie de
 * la page, le #boot-loader d'index.html (hors de #root, React n'y touche pas).
 * Les écrans d'attente ne dessinent plus leur propre monogramme : ils le
 * réclament (`acquire`) et le rendent (`release`). Son animation ne repart
 * donc jamais du début quand un écran d'attente en relaie un autre
 * (démarrage → connexion → page → onglet) — elle se coupait et reprenait.
 *
 * Jamais effacé en plein saut : une fois apparu, il finit son cycle et
 * s'efface pendant le repos qui le termine (apparition « fantôme » : même un
 * chargement qui finit juste après l'apparition montre un saut complet).
 * Le contenu qu'il fait patienter attend qu'il ait disparu (cf.
 * `useScreenLoader`) : pas de superposition.
 */

// Même délai et même fondu que PageLoader et que l'apparition au démarrage.
const DELAY_MS = 1000;
// Un écran d'attente qui disparaît est souvent aussitôt relayé par un autre
// (même rendu React) : on attend un instant avant de masquer.
const HANDOFF_MS = 60;
// Boucle de infflunch-anim-chargement.svg : 1,1 s, couverts au repos à
// partir de 79,1 % — le fondu de sortie (0,25 s) tient dans ce repos.
const CYCLE_MS = 1100;
const REST_MS = 870;
const FADE_MS = 250;

// Le démarrage compte comme une demande, rendue après le premier rendu de
// l'app (cf. `releaseBoot`).
let count = 1;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let pauseTimer: ReturnType<typeof setTimeout> | undefined;
let detached = false;

// À l'écran (même en train d'apparaître ou de s'effacer) : le contenu qui
// l'attendait patiente jusqu'à ce que ce soit faux.
let onScreen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setOnScreen = (value: boolean) => {
  if (onScreen === value) return;
  onScreen = value;
  emit();
};
// Démarrage : index.html le fait apparaître à 1 s (animation CSS).
const bootTimer = setTimeout(
  () => {
    if (!detached) setOnScreen(true);
  },
  Math.max(0, DELAY_MS - performance.now()),
);

const el = () => document.getElementById("boot-loader");

/** Animations de la boucle (pas le fondu de l'élément lui-même). Vide si
 *  « Réduire les animations » est actif. */
const loopAnimations = (node: HTMLElement) =>
  node.querySelector("svg")?.getAnimations({ subtree: true }) ?? [];

const loopDelay = (a: Animation) => Number(a.effect?.getTiming().delay ?? 0);

/** Temps restant avant le prochain repos de la boucle (0 si elle n'a pas
 *  encore démarré : rien de visible n'est interrompu). */
const untilRest = (node: HTMLElement) => {
  const a = loopAnimations(node)[0];
  if (!a || a.currentTime == null) return 0;
  const t = Number(a.currentTime) - loopDelay(a);
  if (t < 0) return 0;
  const phase = t % CYCLE_MS;
  return phase <= REST_MS ? REST_MS - phase : CYCLE_MS - phase + REST_MS;
};

/** Sort l'élément de son animation CSS de démarrage, à l'opacité où il en
 *  est : la suite passe par des transitions pilotées d'ici. */
const detach = (node: HTMLElement) => {
  if (detached) return;
  detached = true;
  node.style.opacity = getComputedStyle(node).opacity;
  node.classList.remove("booting");
  // Style recalculé tout de suite : sinon le changement d'opacité qui suit
  // (même tâche) part de la valeur de base, 0, et l'effacement est sec.
  void getComputedStyle(node).opacity;
};

const isShown = (node: HTMLElement) =>
  Number(getComputedStyle(node).opacity) > 0 || node.style.opacity === "1";

const setVisible = (visible: boolean) => {
  const node = el();
  if (!node) return;
  clearTimeout(bootTimer);
  // Pas encore apparu au démarrage : rien à effacer.
  const wasShown = detached ? onScreen : isShown(node);
  detach(node);
  clearTimeout(pauseTimer);
  if (visible) {
    setOnScreen(true);
    // Chaque apparition part du début de la boucle.
    for (const a of loopAnimations(node)) {
      a.currentTime = loopDelay(a);
      a.play();
    }
  } else {
    // Invisible : la boucle s'arrête une fois le fondu fini.
    if (!wasShown) setOnScreen(false);
    pauseTimer = setTimeout(() => {
      for (const a of loopAnimations(node)) a.pause();
      setOnScreen(false);
    }, wasShown ? FADE_MS : 0);
  }
  node.style.opacity = visible ? "1" : "0";
  // Masqué : plus annoncé comme « Chargement » aux lecteurs d'écran.
  node.toggleAttribute("aria-hidden", !visible);
};

const scheduleShow = () => {
  // Effacement en attente (fin de cycle) : annulé, l'animation continue.
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
    hideTimer = undefined;
    if (count > 0) return;
    clearTimeout(showTimer);
    showTimer = undefined;
    const node = el();
    if (!node) return;
    // Visible (ou en train d'apparaître) : on attend le repos de la boucle.
    const wait = isShown(node) ? untilRest(node) : 0;
    if (wait === 0) return setVisible(false);
    hideTimer = setTimeout(() => {
      hideTimer = undefined;
      if (count === 0) setVisible(false);
    }, wait);
  }, HANDOFF_MS);
};

export const acquireScreenLoader = () => {
  count += 1;
  emit();
  scheduleShow();
};

export const releaseScreenLoader = () => {
  count = Math.max(0, count - 1);
  emit();
  if (count === 0) scheduleHide();
};

export const subscribeScreenLoader = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Demandes en cours, ou -1 s'il n'est pas à l'écran. */
export const screenLoaderSnapshot = () => (onScreen ? count : -1);

/** Attente en cours (demandée, ou monogramme encore à l'écran) : la page
 *  n'est pas complète. */
export const screenLoaderBusy = () => count > 0 || onScreen;

let bootReleased = false;
/** Fin du démarrage : à appeler une fois l'app montée. Si aucun écran
 *  d'attente n'a pris le relais (page de connexion…), le monogramme s'efface. */
export const releaseBoot = () => {
  if (bootReleased) return;
  bootReleased = true;
  releaseScreenLoader();
};

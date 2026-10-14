import { lazy, useState, type ComponentType, type LazyExoticComponent } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export type PreloadableComponent<T extends AnyComponent> = LazyExoticComponent<T> & {
  /** Télécharge le chunk sans afficher le composant. */
  preload: () => Promise<unknown>;
};

const registry: (() => Promise<unknown>)[] = [];

/**
 * `React.lazy` + `preload()`. Le composant est enregistré pour
 * `preloadLazyPages()` : les pages secondaires sont téléchargées en tâche de
 * fond une fois l'écran principal prêt, la navigation reste instantanée.
 */
export function lazyPage<T extends AnyComponent>(
  load: () => Promise<{ default: T }>,
  /** false : pas de préchargement en tâche de fond (ex. réservé aux admins,
   *  à précharger soi-même via `preload()`). */
  { background = true }: { background?: boolean } = {},
): PreloadableComponent<T> {
  let promise: Promise<{ default: T }> | null = null;
  const once = () => (promise ??= load());
  const component = lazy(once) as PreloadableComponent<T>;
  component.preload = once;
  if (background) registry.push(once);
  return component;
}

/**
 * Dialogue chargé à la demande : vrai dès la première ouverture, puis le reste
 * (le dialogue reste monté pour jouer ses animations de fermeture/réouverture).
 */
export function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened;
}

/** Réseau considéré calme : aucune ressource terminée depuis ce délai. */
const QUIET_MS = 1500;
/** Préchargement lancé quoi qu'il arrive passé ce délai. */
const MAX_WAIT_MS = 20000;

let scheduled = false;

/**
 * Précharge tous les composants `lazyPage`, une seule fois, quand le réseau
 * est calme (photos de l'écran comprises : l'évènement `load` ne les attend
 * pas, elles sont en chargement différé) : la bande passante sert d'abord à
 * l'écran affiché.
 */
export function preloadLazyPages() {
  if (scheduled) return;
  scheduled = true;
  let timer: ReturnType<typeof setTimeout>;
  let observer: PerformanceObserver | undefined;
  const run = () => {
    clearTimeout(timer);
    clearTimeout(cap);
    observer?.disconnect();
    // Un échec (hors ligne…) n'est pas grave : le chunk sera demandé à l'ouverture.
    for (const load of registry) load().catch(() => undefined);
  };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(run, QUIET_MS);
  };
  const cap = setTimeout(run, MAX_WAIT_MS);
  try {
    // Chaque ressource terminée (image, requête…) repousse le préchargement.
    observer = new PerformanceObserver(arm);
    observer.observe({ type: "resource" });
  } catch {
    /* PerformanceObserver indisponible : simple délai */
  }
  arm();
}

// L'intro du logo se joue à chaque chargement de page (ouverture comme
// rechargement), une seule fois : les logos montés ensemble au premier rendu
// (<Logotype /> et <Monogramme />, l'un caché selon la largeur d'écran) la
// jouent tous les deux, un logo remonté plus tard (changement de page) non.

// Fenêtre pendant laquelle un montage compte comme « le premier rendu ».
const FIRST_RENDER_MS = 300;

let firstCall: number | null = null;

export function shouldPlayIntro() {
  const now = performance.now();
  if (firstCall === null) firstCall = now;
  return now - firstCall < FIRST_RENDER_MS;
}

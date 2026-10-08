import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog } from "@/components/ui/dialog";
import { ACHIEVEMENTS, Achievement } from "@/data/achievements";
import { cn } from "@/lib/utils";

/** Nom du fichier d'une illustration (« joconde.svg »). */
const fileOf = (a: Achievement) => a.image?.split("/").pop() ?? "—";

/**
 * Onglet admin « Illustrations » : toutes les images de succès en grand, pour
 * les contrôler d'un coup d'œil (style, cadrage, détourage). Outil de travail,
 * rien n'y est modifiable. Clic sur une tuile = l'image en plein écran.
 */
const AdminIllustrations = () => {
  const [opened, setOpened] = useState<Achievement | null>(null);

  // Popup ouverte : plus aucun glissé tactile derrière elle (défilement de la
  // grille ou de la page, tirer-pour-recharger). Capture sur le document :
  // passe avant les écouteurs des zones de défilement.
  useEffect(() => {
    if (!opened) return;
    const block = (e: TouchEvent) => e.cancelable && e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false, capture: true });
    return () =>
      document.removeEventListener("touchmove", block, { capture: true });
  }, [opened]);

  const items = ACHIEVEMENTS.filter((a) => a.image);

  return (
    // Même cadre que les tables admin (marges latérales et basse en desktop).
    <div className="tw-scope flex h-full w-full flex-col sm:px-4 sm:pb-4">
      {/* Une grille continue, pas des tuiles : cases jointives, séparées d'un
          filet (le fond `bg-border` qui passe entre elles), dans un cadre. */}
      <ScrollArea className="max-h-full min-h-0 w-full overflow-hidden rounded-card border border-border">
        <ul className="m-0 grid list-none grid-cols-3 gap-px bg-border p-0 sm:grid-cols-6">
          {items.map((a) => (
            <li key={a.id} className="bg-card">
              <button
                type="button"
                onClick={() => setOpened(a)}
                aria-label={`Agrandir ${a.title}`}
                className="group flex h-full w-full cursor-pointer flex-col bg-card text-center transition hover:bg-muted/40"
              >
                {/* Case 5:4 (illustration à 70 % de la largeur, petite marge
                    haute et basse). Image en absolu : dans une case à ratio, un
                    contenu plus grand (les SVG font 500-700 px) l'étirerait
                    en hauteur — la case ne garderait pas ses proportions. */}
                <span className="relative block aspect-[5/4] w-full">
                  <img
                    src={a.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-x-[15%] inset-y-[6.25%] h-[87.5%] w-[70%] object-contain"
                  />
                </span>
                <span className="mt-auto block border-t border-border bg-muted/40 px-2 py-1">
                  <span className="block truncate text-xs font-semibold text-card-foreground">
                    {a.title}
                  </span>
                  <span className="block truncate text-[10px] text-foreground/50">
                    {fileOf(a)} · {a.id}
                    {a.secret && " · secret"}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {/* Dernière ligne incomplète : cases vides, sinon le filet gris
              (fond de la grille) y paraîtrait comme un trou. 3 colonnes sur
              mobile, 6 sur desktop. */}
          {Array.from({ length: (6 - (items.length % 6)) % 6 }, (_, i) => (
            <li
              key={`vide-${i}`}
              aria-hidden
              className={cn(
                "bg-card",
                i >= (3 - (items.length % 3)) % 3 && "hidden sm:block",
              )}
            />
          ))}
        </ul>
      </ScrollArea>

      {/* Plein écran : l'image au plus grand, dans la popup standard (croix,
          Échap ; pas de fermeture au clic extérieur). Sur mobile, le fond ne
          glisse pas tant qu'elle est ouverte (cf. effet plus haut). */}
      <Dialog
        open={!!opened}
        onClose={() => setOpened(null)}
        showClose
        className="max-w-[min(75vh,90vw)] overflow-hidden p-0 text-center sm:p-0"
      >
        {opened && (
          <div data-no-pull>
            <span className="relative block aspect-square w-full">
              <img
                src={opened.image}
                alt=""
                className="absolute inset-0 h-full w-full object-contain p-6"
              />
            </span>
            <span className="block border-t border-border bg-muted/40 px-4 py-2">
              <span className="block text-base font-semibold text-card-foreground">
                {opened.title}
              </span>
              <span className="block text-xs text-foreground/50">
                {fileOf(opened)} · {opened.id}
                {opened.secret && " · secret"}
              </span>
            </span>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default AdminIllustrations;

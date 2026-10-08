import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  // Échap referme la vue plein écran.
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpened(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
                className="group flex h-full w-full cursor-pointer flex-col bg-card text-left transition hover:bg-muted/40"
              >
                {/* Case 5:4 (illustration à 70 % de la largeur, petite marge
                    haute et basse). Image en absolu : dans une case à ratio, un
                    contenu plus grand (les SVG font 500-700 px) l'étirerait
                    en hauteur — la case ne garderait pas ses proportions. */}
                <span
                  className="relative block aspect-[5/4] w-full bg-white"
                >
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

      {/* Plein écran : l'image au plus grand. */}
      {opened && (
        <div
          role="dialog"
          aria-label={opened.title}
          data-no-pull
          onClick={() => setOpened(null)}
          className="fixed inset-0 z-[1200] flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOpened(null)}
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <FiX className="h-6 w-6" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-square w-[min(80vh,90vw)] rounded-card bg-white"
          >
            <img
              src={opened.image}
              alt=""
              className="absolute inset-0 h-full w-full object-contain p-6"
            />
          </div>
          <p className="m-0 text-center text-sm text-white/80">
            <span className="font-semibold text-white">{opened.title}</span>
            {" · "}
            {fileOf(opened)}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminIllustrations;

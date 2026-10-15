import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { OverlayScrollbars } from "overlayscrollbars";
import {
  screenLoaderBusy,
  subscribeScreenLoader,
} from "@/components/brand/screenLoaderControl";
import { cn } from "@/lib/utils";

/** Durée du glissement de la barre quand la hauteur du contenu change
 *  (aligné sur la transition de `.os-page-resizing`, tailwind.css). */
const RESIZE_MS = 300;

/**
 * Barre de défilement d'une zone de page (page principale, panneaux de Mon
 * compte mobile) : OverlayScrollbars, pas la barre native (que le navigateur
 * dessine sans transition possible, et qui prend de la place). L'élément de
 * `viewportRef` reste celui qui défile : écouteurs de défilement, scrollTop,
 * tirer-pour-rafraîchir restent branchés dessus. Il doit être l'enfant
 * direct de l'élément de `hostRef`, qui reçoit `className`. ⚠️ Le padding
 * du viewport est remis à zéro par OverlayScrollbars : marges sur un bloc
 * intérieur.
 * - flottante : aucune gouttière, la largeur ne change jamais ;
 * - visible pendant le défilement seulement, effacée en fondu 1,2 s après ;
 * - jamais pendant un chargement ;
 * - taille et position glissent quand la hauteur du contenu change.
 * Initialisée en layout effect : la barre native n'apparaît jamais.
 */
export default function usePageScrollbar<T extends HTMLElement>(enabled = true) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<T>(null);
  const busy = useSyncExternalStore(subscribeScreenLoader, screenLoaderBusy);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const viewport = viewportRef.current;
    if (!enabled || !host || !viewport) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const os = OverlayScrollbars(
      { target: host, elements: { viewport } },
      {
        overflow: { x: "hidden" },
        scrollbars: {
          // Visible pendant le défilement (molette, doigt, glisser), puis
          // s'efface en fondu 1,2 s après — souris comme doigt.
          autoHide: "scroll",
          autoHideDelay: 1200,
          theme: "os-infflunch",
        },
      },
      {
        // Hauteur du contenu changée (chargement, « voir plus », onglet…) :
        // glissement le temps de la transition seulement — en défilement
        // normal, la barre suit le doigt ou la molette sans retard.
        updated(_, { updateHints }) {
          if (!updateHints.overflowAmountChanged) return;
          host.classList.add("os-page-resizing");
          clearTimeout(timer);
          timer = setTimeout(
            () => host.classList.remove("os-page-resizing"),
            RESIZE_MS,
          );
        },
      },
    );
    return () => {
      clearTimeout(timer);
      os.destroy();
    };
  }, [enabled]);

  return {
    hostRef,
    viewportRef,
    className: cn("os-page", busy && "os-page-busy"),
  };
}

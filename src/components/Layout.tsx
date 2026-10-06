import Footer from "./Footer";
import Navbar from "./Navbar";
import { RestaurantFilters } from "../pages/UserPage";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import PullToRefresh from "@/components/PullToRefresh";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  centerContent?: boolean;
  /**
   * Contenu pleine hauteur sans scroll de page ni footer : le scroll se fait
   * À L'INTÉRIEUR du contenu (tables admin). Sinon la page scrolle (grille, etc.).
   */
  fillContent?: boolean;
  withNavbar?: boolean;
  navbarProps?: {
    page: string;
    setPage: (page: string) => void;
    onFilterChange: (query: RestaurantFilters) => void;
  };
  /**
   * Barre d'outils propre à une page (ex. Restaurants), rendue dans un second
   * bandeau sticky sous la navbar. La navbar reste dédiée à la navigation.
   */
  toolbar?: React.ReactNode;
  /**
   * Bandeau d'outils vide, à remplir par la page via un portail sur
   * `#page-toolbar` (ex. roue des sous-onglets de Mon compte sur mobile).
   */
  toolbarPortal?: boolean;
  /** Mobile : tirer vers le bas en haut de page rafraîchit les données. */
  pullToRefresh?: boolean;
  /**
   * `false` = le Layout ne rend pas le footer (écran pleine hauteur dont les
   * panneaux scrollent eux-mêmes et l'affichent en fin de contenu, ex. Mon
   * compte mobile). Le footer doit rester présent sur tous les écrans.
   */
  footer?: boolean;
}

/** Position de défilement de <main> par entrée d'historique (location.key),
 *  le temps de la session : de quoi la retrouver au retour. */
const scrollPositions = new Map<string, number>();
/** Le contenu d'une page revenue peut arriver un peu après (PageReveal,
 *  données) : on retente la restauration jusqu'à ce délai. */
const RESTORE_MAX_MS = 1500;

const Layout = ({
  children,
  centerContent = false,
  fillContent = false,
  withNavbar = false,
  navbarProps,
  toolbar,
  pullToRefresh = false,
  toolbarPortal = false,
  footer = true,
}: LayoutProps) => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  // C'est <main> qui scrolle (pas window), et il survit aux changements de
  // page : sans ça, une nouvelle page s'ouvrait à la position de l'ancienne.
  // Mémorisation au fil du défilement, sous la clé de l'entrée affichée.
  const keyRef = useRef(location.key);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const save = () => scrollPositions.set(keyRef.current, main.scrollTop);
    main.addEventListener("scroll", save, { passive: true });
    return () => main.removeEventListener("scroll", save);
  }, [fillContent]);

  // Nouvelle page (lien, replace) → en haut. Retour/avance (flèche « Retour »
  // = navigate(-1), ou bouton du navigateur : POP) → position mémorisée.
  // Layout effect : la clé change avant que le contenu remplacé ne déclenche
  // un « scroll » qui écraserait la position de la page quittée.
  useLayoutEffect(() => {
    keyRef.current = location.key;
    const main = mainRef.current;
    if (!main) return;
    const target =
      navigationType === "POP" ? scrollPositions.get(location.key) ?? 0 : 0;
    main.scrollTop = target;
    if (target === 0) return;

    // Contenu pas encore assez haut : on retente à chaque frame, et l'on
    // s'arrête dès que l'utilisateur reprend la main.
    let frame = 0;
    const start = performance.now();
    const stop = () => cancelAnimationFrame(frame);
    const retry = () => {
      main.scrollTop = target;
      if (
        Math.abs(main.scrollTop - target) > 1 &&
        performance.now() - start < RESTORE_MAX_MS
      )
        frame = requestAnimationFrame(retry);
    };
    frame = requestAnimationFrame(retry);
    const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    events.forEach((e) => main.addEventListener(e, stop, { passive: true }));
    return () => {
      stop();
      events.forEach((e) => main.removeEventListener(e, stop));
    };
  }, [location.key, navigationType]);
  const content = pullToRefresh ? (
    <PullToRefresh scrollRef={mainRef}>{children}</PullToRefresh>
  ) : (
    children
  );
  return (
    <div className="tw-scope flex h-dvh flex-col bg-background text-foreground">
      {withNavbar && navbarProps && (
        <header className="sticky top-0 z-[1000] flex h-12 shrink-0 items-center border-b border-border bg-card px-3 shadow-sm sm:h-[60px] sm:px-4">
          <Navbar {...navbarProps} />
        </header>
      )}

      {(toolbar || toolbarPortal) && (
        <div className="sticky top-12 z-[999] shrink-0 border-b border-border bg-card px-3 shadow-sm sm:top-[60px] sm:px-4">
          <div className="mx-auto flex h-11 w-full max-w-[1200px] items-center sm:h-[56px]">
            {toolbar}
            {toolbarPortal && <div id="page-toolbar" className="w-full" />}
          </div>
        </div>
      )}

      {fillContent ? (
        // Pleine hauteur, pas de scroll de page : seul le contenu scrolle.
        <>
          <main className="min-h-0 flex-1 overflow-hidden">
            <div className="mx-auto h-full w-full max-w-[1200px] px-2.5 py-3 sm:px-4 sm:py-6">
              {children}
            </div>
          </main>
          {footer && <Footer compact />}
        </>
      ) : (
        // Colonne flex scrollable : le contenu (`flex-1 shrink-0`) occupe au
        // moins toute la hauteur visible, ce qui cale le footer en bas de
        // l'écran quand la page est courte et sous le contenu quand elle est
        // longue — sans dépendre d'un `min-h-full` en pourcentage.
        // `scrollbar-gutter: stable` : la place de la barre de défilement est
        // toujours réservée, sinon passer d'un contenu long à un court (ex.
        // sous-onglets de Mon compte) l'ôtait, élargissait la page et faisait
        // sauter tout ce qui est centré.
        <main
          ref={mainRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]"
        >
          <div
            className={cn(
              "mx-auto flex w-full max-w-[1200px] flex-1 shrink-0 flex-col px-2.5 py-3 sm:px-4 sm:py-6",
              centerContent && "items-center justify-center",
            )}
          >
            {content}
          </div>
          <Footer />
        </main>
      )}
    </div>
  );
};

export default Layout;

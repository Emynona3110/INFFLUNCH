import Footer from "./Footer";
import Navbar from "./Navbar";
import { RestaurantFilters } from "../pages/UserPage";
import { useEffect, useRef } from "react";
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
  /**
   * Quand cette valeur change, le contenu remonte en haut. À passer (ex. le
   * pathname) sur les pages où une navigation réutilise le même Layout sans
   * le remonter — mentions légales ↔ confidentialité —, sinon on arrive au
   * milieu de la nouvelle page, à la position de l'ancienne.
   */
  scrollKey?: string;
}

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
  scrollKey,
}: LayoutProps) => {
  const mainRef = useRef<HTMLElement>(null);
  // C'est <main> qui scrolle (pas window) : c'est lui qu'on remonte.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
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
        <main
          ref={mainRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
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

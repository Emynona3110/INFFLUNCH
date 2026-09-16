import Footer from "./Footer";
import Navbar from "./Navbar";
import { RestaurantFilters } from "../pages/UserPage";
import { useRef } from "react";
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
  /** Mobile : tirer vers le bas en haut de page rafraîchit les données. */
  pullToRefresh?: boolean;
}

const Layout = ({
  children,
  centerContent = false,
  fillContent = false,
  withNavbar = false,
  navbarProps,
  toolbar,
  pullToRefresh = false,
}: LayoutProps) => {
  const mainRef = useRef<HTMLElement>(null);
  const content = pullToRefresh ? (
    <PullToRefresh scrollRef={mainRef}>{children}</PullToRefresh>
  ) : (
    children
  );
  return (
    <div className="tw-scope flex h-screen flex-col bg-background text-foreground">
      {withNavbar && navbarProps && (
        <header className="sticky top-0 z-[1000] flex h-12 shrink-0 items-center border-b border-border bg-card px-3 shadow-sm sm:h-[60px] sm:px-4">
          <Navbar {...navbarProps} />
        </header>
      )}

      {toolbar && (
        <div className="sticky top-12 z-[999] shrink-0 border-b border-border bg-card px-3 shadow-sm sm:top-[60px] sm:px-4">
          <div className="mx-auto flex h-11 w-full max-w-[1200px] items-center sm:h-[56px]">
            {toolbar}
          </div>
        </div>
      )}

      {fillContent ? (
        // Pleine hauteur, pas de scroll de page : seul le contenu scrolle.
        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto h-full w-full max-w-[1200px] px-2.5 py-3 sm:px-4 sm:py-6">
            {children}
          </div>
        </main>
      ) : (
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overscroll-y-contain"
        >
          <div className="flex min-h-full flex-col">
            <div
              className={cn(
                "mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-2.5 py-3 sm:px-4 sm:py-6",
                centerContent && "items-center justify-center"
              )}
            >
              {content}
            </div>
            <Footer />
          </div>
        </main>
      )}
    </div>
  );
};

export default Layout;

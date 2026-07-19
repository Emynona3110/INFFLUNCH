import Footer from "./Footer";
import Navbar from "./Navbar";
import { RestaurantFilters } from "../pages/UserPage";
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
}

const Layout = ({
  children,
  centerContent = false,
  fillContent = false,
  withNavbar = false,
  navbarProps,
  toolbar,
}: LayoutProps) => {
  return (
    <div className="tw-scope flex h-screen flex-col bg-background text-foreground">
      {withNavbar && navbarProps && (
        <header className="sticky top-0 z-[1000] flex h-[60px] shrink-0 items-center border-b border-border bg-card px-4 shadow-sm">
          <Navbar {...navbarProps} />
        </header>
      )}

      {toolbar && (
        <div className="sticky top-[60px] z-[999] shrink-0 border-b border-border bg-card px-4 shadow-sm">
          <div className="mx-auto flex h-[56px] w-full max-w-[1200px] items-center">
            {toolbar}
          </div>
        </div>
      )}

      {fillContent ? (
        // Pleine hauteur, pas de scroll de page : seul le contenu scrolle.
        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto h-full w-full max-w-[1200px] px-4 py-6">
            {children}
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col">
            <div
              className={cn(
                "mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 py-6",
                centerContent && "items-center justify-center"
              )}
            >
              {children}
            </div>
            <Footer />
          </div>
        </main>
      )}
    </div>
  );
};

export default Layout;

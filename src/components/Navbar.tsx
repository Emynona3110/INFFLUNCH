import { useState } from "react";
import { FiMoreVertical } from "react-icons/fi";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import ColorModeSwitch from "./ColorModeSwitch";
import useIsAdmin from "../hooks/useIsAdmin";
import useAccessRequests from "../hooks/useAccessRequests";
import useChangelogSeen from "../hooks/useChangelogSeen";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
import useLunchToday from "../hooks/useLunchToday";
import {
  buildUserSections,
  defaultRestaurantFilters,
  RestaurantFilters,
} from "../pages/UserPage";
import { cn } from "@/lib/utils";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
  onFilterChange: (query: RestaurantFilters) => void;
}

const Navbar = ({ page, setPage, onFilterChange }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const sections = buildUserSections(isAdmin);

  // Puce "demandes en attente" (admins uniquement, la requête est gated par rôle).
  const { data: requests = [] } = useAccessRequests();
  const pendingCount = requests.filter((r) => r.state === "Waiting").length;

  // Puce "nouveautés non vues" (tous les utilisateurs).
  const { hasUnseen } = useChangelogSeen();

  // Puce "succès non vus" : un succès débloqué n'a pas encore été consulté
  // dans la galerie (onglet Succès de Mon Profil).
  const { hasUnseen: hasUnseenAchievements } = useAchievementsSeen();

  // Puce "déjeuner" : des collègues se sont positionnés et pas moi → invitation à
  // choisir. Disparaît dès qu'on a déclaré son restaurant du jour.
  const { participants, myRestaurantId } = useLunchToday();
  const lunchPending = participants.length > 0 && myRestaurantId == null;

  return (
    <div className="flex h-full w-full select-none items-center justify-between gap-1">
      <div className="flex h-full items-center gap-1">
        <div
          className="flex cursor-pointer items-center"
          onClick={() => {
            onFilterChange(defaultRestaurantFilters);
            setPage("restaurants");
          }}
        >
          <img src={darkLogo} alt="" className="block h-7 w-7 dark:hidden" />
          <img src={lightLogo} alt="" className="hidden h-7 w-7 dark:block" />
          <span className="ml-1 mr-4 hidden font-display text-lg font-extrabold text-[#113894] dark:text-white xl:block">
            {isAdmin ? "ADMINFFLUNCH" : "INFFLUNCH"}
          </span>
        </div>

        {/* Onglets desktop/tablette (masqués sur mobile < md → menu burger) */}
        <nav className="hidden h-full items-center md:flex">
          {sections.map((item) => {
            const isActive = item.path === page;
            return (
              <div key={item.path} className="h-full px-1.5">
                <button
                  type="button"
                  onClick={() => setPage(item.path)}
                  className={cn(
                    "relative flex h-full cursor-pointer items-center border-b-2 text-lg transition",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/50 hover:text-foreground"
                  )}
                >
                  {/* Calque fantôme gras : réserve la largeur → pas de saut d'1px */}
                  <span className="grid">
                    <span
                      className={cn(
                        "col-start-1 row-start-1",
                        isActive && "font-semibold"
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      aria-hidden
                      className="invisible col-start-1 row-start-1 font-semibold"
                    >
                      {item.label}
                    </span>
                  </span>
                  {item.path === "admin" && pendingCount > 0 && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-[#f79220] ring-2 ring-card" />
                  )}
                  {item.path === "nouveautes" && hasUnseen && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                  {item.path === "dejeuner" && lunchPending && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                  {item.path === "mon-compte" && hasUnseenAchievements && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Menu mobile (< md) */}
        <div className="relative md:hidden">
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-md text-foreground/70 transition hover:bg-muted"
          >
            <FiMoreVertical className="h-6 w-6" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                {sections.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setPage(item.path);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "relative block w-full cursor-pointer px-4 py-2 text-left text-base transition hover:bg-muted",
                      page === item.path
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    )}
                  >
                    {item.label}
                    {item.path === "admin" && pendingCount > 0 && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#f79220] ring-2 ring-card" />
                    )}
                    {item.path === "nouveautes" && hasUnseen && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    )}
                    {item.path === "dejeuner" && lunchPending && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    )}
                    {item.path === "mon-compte" && hasUnseenAchievements && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ColorModeSwitch />
    </div>
  );
};

export default Navbar;

import { useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiChevronDown, FiSettings } from "react-icons/fi";
import AccountSettingsDialog from "./AccountSettingsDialog";
import { AnimatePresence, motion } from "framer-motion";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import FeedbackDialog from "./FeedbackDialog";
import { Tooltip } from "@/components/ui/tooltip";
import useIsAdmin from "../hooks/useIsAdmin";
import useAdminPending from "../hooks/useAdminPending";
import useChangelogSeen from "../hooks/useChangelogSeen";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
import useFeedbackSeen from "../hooks/useFeedbackSeen";
import useLunchToday, { isWeekend } from "../hooks/useLunchToday";
import {
  buildUserSections,
  defaultRestaurantFilters,
  RestaurantFilters,
} from "../pages/UserPage";
import { cn } from "@/lib/utils";
import { setFaviconBadge } from "@/lib/faviconBadge";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
  onFilterChange: (query: RestaurantFilters) => void;
}

const Navbar = ({ page, setPage, onFilterChange }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  // Réglages du compte (pp, thème, mdp, déconnexion) : popup via le rouage.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Signaler un bug ou proposer une idée depuis n'importe quel écran : c'est au
  // moment où on le rencontre qu'on le dit, pas après être allé le chercher.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const sections = buildUserSections(isAdmin);

  // Puce de l'onglet Admin : allumée dès qu'un de ses sous-onglets a la sienne
  // (demandes d'accès en attente ou demandes de collaborateurs non classées).
  // Admins uniquement, les requêtes sont gated par rôle.
  const { total: adminPending } = useAdminPending();

  // Puce "nouveautés non vues" (tous les utilisateurs).
  const { hasUnseen } = useChangelogSeen();

  // Puce "succès non vus" : un succès débloqué n'a pas encore été consulté
  // dans la galerie (onglet Succès de Mon Profil).
  const { hasUnseen: hasUnseenAchievements } = useAchievementsSeen();

  // Puce "une de mes demandes a été classée" : l'admin a tranché depuis ma
  // dernière visite de « Mes demandes ». Temps réel via le canal de useFeedback.
  const { hasUnseen: hasUnseenFeedback } = useFeedbackSeen();
  const myAccountDot = hasUnseenAchievements || hasUnseenFeedback;

  // Puce "déjeuner" : je n'ai rien déclaré pour aujourd'hui. Elle disparaît dès
  // que j'ai choisi un restaurant OU dit que je ne mange pas au resto. On attend la fin du
  // chargement, sinon elle clignote à chaque arrivée sur l'app.
  const { hasPlan, loading: lunchLoading } = useLunchToday();
  // Le week-end, la question ne se pose pas.
  const lunchPending = !lunchLoading && !hasPlan && !isWeekend();

  // Report des puces sur l'icône d'onglet du navigateur (et sur l'icône
  // d'application en PWA installée) : une seule pastille, dès qu'au moins une
  // puce est allumée dans la navbar.
  const hasDot = adminPending > 0 || hasUnseen || myAccountDot || lunchPending;
  useEffect(() => {
    setFaviconBadge(hasDot);
  }, [hasDot]);
  // Navbar démontée (déconnexion, pages publiques) : on retire la pastille.
  useEffect(() => () => setFaviconBadge(false), []);

  // Couleur de la puce d'un onglet (null si rien à signaler).
  const dotFor = (path: string): string | null => {
    if (path === "admin" && adminPending > 0) return "bg-[#f79220]";
    if (path === "nouveautes" && hasUnseen) return "bg-primary";
    if (path === "dejeuner" && lunchPending) return "bg-primary";
    if (path === "mon-compte" && myAccountDot) return "bg-primary";
    return null;
  };
  // Mobile : libellé de l'onglet courant (fiche resto = Restaurants ; profil
  // d'un collègue = pas d'onglet) et puce si un AUTRE onglet a quelque chose.
  const currentLabel =
    sections.find((item) => item.path === page)?.label ?? "Profil";
  const othersDot =
    sections
      .filter((item) => item.path !== page)
      .map((item) => dotFor(item.path))
      .find(Boolean) ?? null;

  // Fermeture du menu mobile au tap ailleurs.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  return (
    <div className="relative flex h-full w-full select-none items-center justify-between gap-1">
      <div className="flex h-full items-center gap-1">
        <div
          className="flex cursor-pointer items-center"
          onClick={() => {
            onFilterChange(defaultRestaurantFilters);
            setPage("restaurants");
          }}
        >
          <img
            src={darkLogo}
            alt=""
            className="block h-6 w-6 dark:hidden sm:h-7 sm:w-7"
          />
          <img
            src={lightLogo}
            alt=""
            className="hidden h-6 w-6 dark:block sm:h-7 sm:w-7"
          />
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
                      : "border-transparent text-foreground/50 hover:text-foreground",
                  )}
                >
                  {/* Calque fantôme gras : réserve la largeur → pas de saut d'1px */}
                  <span className="grid">
                    <span
                      className={cn(
                        "col-start-1 row-start-1",
                        isActive && "font-semibold",
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
                  {item.path === "admin" && adminPending > 0 && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-[#f79220] ring-2 ring-card" />
                  )}
                  {item.path === "nouveautes" && hasUnseen && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                  {item.path === "dejeuner" && lunchPending && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                  {item.path === "mon-compte" && myAccountDot && (
                    <span className="absolute right-0 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Mobile (< md) : nom de l'onglet courant, à gauche ; au tap, les autres
            onglets se déroulent dessous (même animation que le sélecteur de vue). */}
        <div
          ref={menuRef}
          className="relative ml-1 flex h-full items-center md:hidden"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="relative flex h-8 items-center gap-1 rounded-full bg-muted px-3 font-display text-sm font-bold text-primary"
          >
            {currentLabel}
            <FiChevronDown
              className={cn(
                "h-4 w-4 text-foreground/50 transition-transform",
                menuOpen && "rotate-180",
              )}
            />
            {othersDot && !menuOpen && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                  othersDot,
                )}
              />
            )}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scaleY: 0.6 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ originY: 0 }}
                className="absolute left-0 top-full z-20 flex flex-col gap-1 rounded-2xl bg-muted p-1 shadow-md"
              >
                {sections
                  .filter((item) => item.path !== page)
                  .map((item, i) => {
                    const dot = dotFor(item.path);
                    return (
                      <motion.button
                        key={item.path}
                        type="button"
                        role="menuitem"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * i, duration: 0.15 }}
                        onClick={() => {
                          setPage(item.path);
                          setMenuOpen(false);
                        }}
                        className="relative flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-card px-3 text-sm font-medium text-foreground/80 shadow-sm"
                      >
                        {item.label}
                        {dot && (
                          <span
                            className={cn(
                              "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                              dot,
                            )}
                          />
                        )}
                      </motion.button>
                    );
                  })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip label="Un souci, une idée ?">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Un souci, une idée ?"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted sm:h-9 sm:w-9 hover:text-primary"
          >
            <FiMessageSquare className="h-5 w-5" />
          </button>
        </Tooltip>
        {/* Réglages du compte (avatar, mot de passe, déconnexion…). */}
        <Tooltip label="Réglages">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Réglages"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary sm:h-9 sm:w-9"
          >
            <FiSettings className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>

      <FeedbackDialog
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <AccountSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Navbar;

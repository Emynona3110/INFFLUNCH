import { useEffect, useRef, useState } from "react";
import {
  FiMessageSquare,
  FiChevronDown,
  FiSettings,
  FiHelpCircle,
  FiInfo,
  FiUser,
  FiShield,
  FiLogOut,
  FiBookOpen,
} from "react-icons/fi";
import { LuMegaphone } from "react-icons/lu";
import AccountSettingsDialog from "./AccountSettingsDialog";
import Avatar from "./Avatar";
import NavMenu from "./NavMenu";
import useSession from "../hooks/useSession";
import useProfile from "../hooks/useProfile";
import { AnimatePresence, motion } from "framer-motion";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import FeedbackDialog from "./FeedbackDialog";
import ProposeRestaurantDialog from "./ProposeRestaurantDialog";
import RestaurantDialog from "@/admin/Dialogs/RestaurantDialog";
import ChefHatPlus from "./icons/ChefHatPlus";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { Tooltip } from "@/components/ui/tooltip";
import useIsAdmin from "../hooks/useIsAdmin";
import useAdminPending from "../hooks/useAdminPending";
import useChangelogSeen from "../hooks/useChangelogSeen";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
import useFeedbackSeen from "../hooks/useFeedbackSeen";
import useSuggestionsSeen from "../hooks/useSuggestionsSeen";
import useLunchToday, { isWeekend } from "../hooks/useLunchToday";
import useUnpricedLunches from "../hooks/useUnpricedLunches";
import {
  buildUserSections,
  defaultRestaurantFilters,
  RestaurantFilters,
} from "../pages/UserPage";
import { cn } from "@/lib/utils";
import { setFaviconBadge } from "@/lib/faviconBadge";
import usePrefetch from "@/hooks/usePrefetch";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
  onFilterChange: (query: RestaurantFilters) => void;
}

const Navbar = ({ page, setPage, onFilterChange }: NavbarProps) => {
  const { prefetchSection } = usePrefetch();
  const [menuOpen, setMenuOpen] = useState(false);
  // Réglages du compte (pp, thème, mdp, déconnexion) : popup via le rouage.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Signaler un bug ou proposer une idée depuis n'importe quel écran : c'est au
  // moment où on le rencontre qu'on le dit, pas après être allé le chercher.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Ajouter un resto, de n'importe quel écran : l'admin crée la fiche, un
  // collaborateur la propose.
  const [addOpen, setAddOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sections = buildUserSections(isAdmin);
  // Onglets : les trois usages quotidiens. Le reste (Nouveautés, Compte,
  // Admin, À propos) passe par les icônes de droite et le pied de page.
  const tabs = sections.filter((item) => item.tab);
  const { sessionData, signOut } = useSession();
  const { profile } = useProfile();

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
  // Pas pour l'admin : il n'a pas cet onglet (ses demandes vont au backlog).
  const { hasUnseen: hasUnseenFeedback } = useFeedbackSeen();
  // Idem pour mes propositions de restos.
  const { hasUnseen: hasUnseenSuggestions } = useSuggestionsSeen(!isAdmin);
  const myAccountDot =
    hasUnseenAchievements ||
    (!isAdmin && (hasUnseenFeedback || hasUnseenSuggestions));

  // Puce "déjeuner" : je n'ai rien déclaré pour aujourd'hui. Elle disparaît dès
  // que j'ai choisi un restaurant OU dit que je ne mange pas au resto. On attend la fin du
  // chargement, sinon elle clignote à chaque arrivée sur l'app.
  const { hasPlan, loading: lunchLoading } = useLunchToday();
  // Le week-end, la question ne se pose pas.
  const lunchUndeclared = !lunchLoading && !hasPlan && !isWeekend();
  // L'autre raison de passer par la page du midi : un prix réclamé pour un
  // déjeuner récent. Même onglet, donc même puce — c'est la page qui dira
  // laquelle des deux choses est en attente. La règle d'« échéance » (après
  // 14 h pour le jour même) vit dans le hook, pour que la puce et le bloc de
  // la page s'allument ensemble.
  const { pending: pricePending } = useUnpricedLunches();
  const lunchPending = lunchUndeclared || pricePending;

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
    if (path === "admin" && adminPending > 0) return "bg-[#ea580c]";
    if (path === "nouveautes" && hasUnseen) return "bg-[#ea580c]";
    if (path === "dejeuner" && lunchPending) return "bg-[#ea580c]";
    if (path === "mon-compte" && myAccountDot) return "bg-[#ea580c]";
    return null;
  };
  // Mobile : libellé de la page courante (fiche resto = Restaurants ; profil
  // d'un collègue = pas d'onglet) et puce si un AUTRE onglet a quelque chose.
  const currentLabel =
    sections.find((item) => item.path === page)?.label ?? "Profil";
  const othersDot =
    tabs
      .filter((item) => item.path !== page)
      .map((item) => dotFor(item.path))
      .find(Boolean) ?? null;
  // Sur la page du midi elle-même, sa puce reste sur le bouton : elle dit
  // qu'il y a encore quelque chose à faire ICI (midi à déclarer, prix à
  // donner), menu ouvert ou non.
  const currentDot = page === "dejeuner" ? dotFor("dejeuner") : null;
  const triggerDot = currentDot ?? (menuOpen ? null : othersDot);

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
            className="block h-7 w-7 dark:hidden sm:h-8 sm:w-8"
          />
          <img
            src={lightLogo}
            alt=""
            className="hidden h-7 w-7 dark:block sm:h-8 sm:w-8"
          />
          <span className="ml-1 mr-4 hidden font-display text-lg font-extrabold text-[#113894] dark:text-white xl:block">
            {isAdmin ? "ADMINFFLUNCH" : "INFFLUNCH"}
          </span>
        </div>

        {/* Onglets desktop/tablette (masqués sur mobile < md → menu burger) */}
        <nav className="hidden h-full items-center md:flex">
          {tabs.map((item) => {
            const isActive = item.path === page;
            return (
              <div key={item.path} className="h-full px-1.5">
                <button
                  type="button"
                  onClick={() => setPage(item.path)}
                  // Données de l'onglet chargées dès le survol.
                  onMouseEnter={() => prefetchSection(item.path)}
                  className={cn(
                    "relative flex h-full cursor-pointer items-center text-lg transition",
                    isActive
                      ? "text-primary"
                      : "text-foreground/50 hover:text-foreground",
                  )}
                >
                  {/* Calque fantôme gras : réserve la largeur → pas de saut d'1px.
                      La puce s'accroche au libellé (coin haut-droit, juste
                      au-delà du texte), pas à toute la hauteur de la barre. */}
                  <span className="relative grid">
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
                    {dotFor(item.path) && (
                      <span
                        className={cn(
                          "absolute -right-1.5 top-1 h-2 w-2 rounded-full ring-2 ring-card",
                          dotFor(item.path),
                        )}
                      />
                    )}
                  </span>
                  {/* Trait de l'onglet actif (3px) : un seul trait partagé
                      (`layoutId`) qui glisse d'un onglet à l'autre. */}
                  {isActive && (
                    <motion.span
                      layoutId="navbar-underline"
                      className="absolute inset-x-0 bottom-0 h-[3px] bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
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
            {triggerDot && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                  triggerDot,
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
                {tabs
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
                        onTouchStart={() => prefetchSection(item.path)}
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

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Tooltip label={isAdmin ? "Ajouter un restaurant" : "Proposer un restaurant"}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label={isAdmin ? "Ajouter un restaurant" : "Proposer un restaurant"}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary sm:h-9 sm:w-9"
          >
            <ChefHatPlus className="h-5 w-5" />
          </button>
        </Tooltip>
        {/* Nouveautés : un mégaphone levé (des annonces du site), pas une cloche, qui
            ferait attendre des notifications personnelles. */}
        <Tooltip label="Nouveautés">
          <button
            type="button"
            onClick={() => setPage("nouveautes")}
            onMouseEnter={() => prefetchSection("nouveautes")}
            aria-label={hasUnseen ? "Nouveautés (non lues)" : "Nouveautés"}
            className={cn(
              "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-muted sm:h-9 sm:w-9",
              page === "nouveautes"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary",
            )}
          >
            <LuMegaphone className="h-5 w-5 -rotate-[30deg]" />
            {hasUnseen && (
              <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#ea580c] ring-2 ring-card" />
            )}
          </button>
        </Tooltip>
        <NavMenu
          label="Aide"
          active={page === "faq" || page === "a-propos"}
          items={[
            {
              label: "FAQ",
              icon: <FiBookOpen />,
              onSelect: () => setPage("faq"),
            },
            {
              label: "Demande",
              icon: <FiMessageSquare />,
              onSelect: () => setFeedbackOpen(true),
            },
            {
              label: "À propos",
              icon: <FiInfo />,
              onSelect: () => setPage("a-propos"),
              onPrefetch: () => prefetchSection("a-propos"),
            },
          ]}
        >
          <FiHelpCircle className="h-5 w-5" />
        </NavMenu>
        {/* Menu du compte : tout ce qui est à moi (profil, réglages, admin,
            déconnexion). Les puces de Compte et d'Admin s'y retrouvent. */}
        {/* `ml-1` : l'avatar remplit son bouton, là où les icônes laissent
            du vide autour d'elles ; sans ce décalage, il collait au « ? ». */}
        <NavMenu
          label="Mon compte"
          className="ml-1"
          active={page === "mon-compte" || page === "admin"}
          dot={myAccountDot || adminPending > 0}
          items={[
            {
              label: "Mon compte",
              icon: <FiUser />,
              dot: myAccountDot,
              onSelect: () => setPage("mon-compte"),
              onPrefetch: () => prefetchSection("mon-compte"),
            },
            ...(isAdmin
              ? [
                  {
                    label: "Admin",
                    icon: <FiShield />,
                    dot: adminPending > 0,
                    onSelect: () => setPage("admin"),
                    onPrefetch: () => prefetchSection("admin"),
                  },
                ]
              : []),
            {
              label: "Réglages",
              icon: <FiSettings />,
              onSelect: () => setSettingsOpen(true),
            },
            {
              label: "Se déconnecter",
              icon: <FiLogOut />,
              onSelect: async () => {
                const error = await signOut();
                if (error)
                  toast({
                    title: "Erreur de déconnexion",
                    description: error,
                    status: "error",
                    duration: 3000,
                  });
                else navigate("/login");
              },
            },
          ]}
        >
          <Avatar
            email={sessionData?.user?.email ?? ""}
            avatarPath={profile?.avatar_path}
            size={28}
            className={cn(
              "ring-2 ring-offset-1 ring-offset-card transition",
              page === "mon-compte" || page === "admin"
                ? "ring-primary"
                : "ring-transparent",
            )}
          />
        </NavMenu>
      </div>

      <FeedbackDialog
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      {isAdmin ? (
        <RestaurantDialog
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={(slug) => {
            setAddOpen(false);
            queryClient.invalidateQueries();
            // On enchaîne sur la fiche toute neuve : c'est là qu'on ajoute
            // photos et menus, autant y être tout de suite.
            if (slug) navigate(`/restaurant/${slug}`);
          }}
        />
      ) : (
        <ProposeRestaurantDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
      )}
      <AccountSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Navbar;

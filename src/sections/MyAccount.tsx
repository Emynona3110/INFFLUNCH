import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import useSession from "../hooks/useSession";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
import useRememberedTab from "@/hooks/useRememberedTab";
import {
  MobileTabSwitcher,
  useSwipeTabs,
} from "@/components/MobileTabSwitcher";
import useMediaQuery from "@/hooks/useMediaQuery";
import UserProfileView from "@/components/UserProfileView";
import useIsAdmin from "../hooks/useIsAdmin";
import AchievementsGallery from "./AchievementsGallery";
import AdminNotes from "./AdminNotes";
import MyFeedback from "./MyFeedback";
import useFeedbackSeen from "@/hooks/useFeedbackSeen";
import { cn } from "@/lib/utils";
const subTabs = [
  // Ce que les autres voient de moi, en premier.
  { key: "profil", label: "Profil", adminOnly: false },
  // « Avis » retiré (2026-09-19) : redondant avec le profil — voir MyReviews.tsx.
  { key: "succes", label: "Succès", adminOnly: false },
  // Suivi de ses propres signalements : l'envoi se fait depuis la navbar.
  { key: "retours", label: "Demandes", adminOnly: false },
  // Carnet de backlog : ce que l'admin repère en naviguant, pour plus tard.
  { key: "backlog", label: "Backlog", adminOnly: true },
] as const;

type SubTabKey = (typeof subTabs)[number]["key"];

const MyAccount = () => {
  const { sessionData } = useSession();
  // Les notifications push ne concernent que les demandes d'accès :
  // inutile de proposer la cloche à qui ne les traite pas.
  const isAdmin = useIsAdmin();

  // Onglet ouvert : pilotable par l'URL (?tab=succes) — c'est ce que vise le
  // clic sur un toast de succès.
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // ?tab= (toast de succès) ou état de navigation (mon propre profil depuis
  // un avatar : l'URL reste propre).
  const stateTab = (location.state as { tab?: string } | null)?.tab ?? null;
  const tabParam = searchParams.get("tab") ?? stateTab;
  const visibleTabs = subTabs.filter((t) => !t.adminOnly || isAdmin);
  // Un ?tab= qui vise un onglet interdit (ou inconnu) est ignoré.
  const isTabKey = (v: string | null): v is SubTabKey =>
    visibleTabs.some((t) => t.key === v);
  // Sans ?tab=, on rouvre le sous-onglet quitté en dernier (session).
  const [active, setActive] = useRememberedTab<SubTabKey>(
    "mon-compte",
    "profil",
    isTabKey,
    isTabKey(tabParam) ? tabParam : null,
  );
  useEffect(() => {
    if (isTabKey(tabParam)) setActive(tabParam);
  }, [tabParam, setActive]);

  // Pastille « succès non vus » : elle s'éteint dès qu'on ouvre la galerie.
  const { hasUnseen: hasUnseenAchievements, markSeen } = useAchievementsSeen();
  // Même signal côté « Demandes » : l'admin a classé une de mes demandes.
  const { hasUnseen: hasUnseenFeedback } = useFeedbackSeen();
  useEffect(() => {
    if (active === "succes") markSeen();
  }, [active, markSeen]);

  const isDesktop = useMediaQuery("(min-width: 640px)");
  const indexOf = (key: SubTabKey) =>
    visibleTabs.findIndex((t) => t.key === key);
  const changeTab = (key: SubTabKey) => setActive(key);

  // Cible du portail (existe après le premier commit du Layout).
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setToolbarSlot(document.getElementById("page-toolbar"));
  }, [isDesktop]);

  // Mobile : balayer le contenu change de sous-onglet.
  const swipe = useSwipeTabs((delta) => {
    const next = visibleTabs[indexOf(active) + delta];
    if (next) changeTab(next.key);
  });

  // Contenu d'un sous-onglet (partagé par le fondu desktop et le pager mobile).
  const renderTab = (tab: SubTabKey) => (
    <>
      {/* Profil : la même page que celle qu'un collègue voit de moi. */}
      {tab === "profil" && sessionData?.user?.id && (
        <UserProfileView userId={sessionData.user.id} isMe />
      )}

      {/* Mes succès */}
      {tab === "succes" && <AchievementsGallery />}

      {/* Mes demandes */}
      {tab === "retours" && <MyFeedback />}

      {/* Backlog (admins) */}
      {tab === "backlog" && isAdmin && <AdminNotes />}
    </>
  );

  // Mobile : onglets déjà ouverts (les autres restent vides tant qu'on n'y
  // est pas passé → pas de requêtes inutiles).
  const [visited, setVisited] = useState<Set<SubTabKey>>(
    () => new Set([active]),
  );
  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  return (
    <div className="tw-scope h-full w-full">
      {/* Mobile : la roue « ‹ Onglet › » est portée dans le bandeau sous la
          navbar (#page-toolbar, fourni par le Layout) ; balayage sur le contenu. */}
      {toolbarSlot &&
        createPortal(
          <MobileTabSwitcher
            tabs={visibleTabs.map((t) => ({
              key: t.key,
              label: t.label,
              dot:
                (t.key === "succes" && hasUnseenAchievements) ||
                (t.key === "retours" && hasUnseenFeedback),
            }))}
            active={active}
            onChange={changeTab}
          />,
          toolbarSlot,
        )}

      {/* Sous-sections (pills) collées sous la navbar, comme la section Admin. */}
      <div className="mb-3 sm:mb-6 hidden flex-wrap justify-center gap-2 sm:flex">
        {visibleTabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "relative inline-flex cursor-pointer items-center rounded-full px-4 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/70 hover:bg-muted/70",
              )}
            >
              {t.label}
              {((t.key === "succes" && hasUnseenAchievements) ||
                (t.key === "retours" && hasUnseenFeedback)) &&
                !isActive && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                )}
            </button>
          );
        })}
      </div>

      {isDesktop ? (
        /* Desktop : carte de la sous-section active, en fondu. Le conteneur
           `relative` ancre l'élément sortant (mis en absolu par popLayout),
           sinon il déborde du document et fait apparaître la barre native. */
        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mx-auto w-full max-w-2xl space-y-6"
            >
              {renderTab(active)}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        /* Mobile : pager façon appli native — chaque sous-onglet est une
           « fenêtre » pleine hauteur avec son propre scroll, la piste glisse
           d'un écran à l'autre en même temps que la roue. Les marges du Layout
           sont annulées pour que les panneaux (et leur barre de défilement)
           aillent jusqu'aux bords. */
        <div
          {...swipe}
          className="-mx-2.5 -my-3 h-[calc(100%+1.5rem)] overflow-hidden"
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${visibleTabs.findIndex((t) => t.key === active) * 100}%)`,
            }}
          >
            {visibleTabs.map((t) => (
              <div
                key={t.key}
                className="flex h-full w-full shrink-0 flex-col overflow-y-auto overscroll-y-contain px-2.5 pt-3"
              >
                {/* Contenu au moins plein écran : le footer se cale en bas
                    quand l'onglet est court, sous le contenu sinon. */}
                <div className="flex-1 shrink-0 space-y-3">
                  {visited.has(t.key) && renderTab(t.key)}
                </div>
                <Footer />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAccount;

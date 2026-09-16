import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { FiCamera, FiTrash2, FiChevronRight } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useSession from "../hooks/useSession";
import useProfile from "../hooks/useProfile";
import useMyReviews from "../hooks/useMyReviews";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
import useRememberedTab from "@/hooks/useRememberedTab";
import {
  MobileTabSwitcher,
  useSwipeTabs,
} from "@/components/MobileTabSwitcher";
import useMediaQuery from "@/hooks/useMediaQuery";
import UserProfileView from "@/components/UserProfileView";
import useIsAdmin from "../hooks/useIsAdmin";
import Avatar from "../components/Avatar";
import ColorModeSwitch from "../components/ColorModeSwitch";
import AchievementsGallery from "./AchievementsGallery";
import AdminNotes from "./AdminNotes";
import MyFeedback from "./MyFeedback";
import useFeedbackSeen from "@/hooks/useFeedbackSeen";
import HoldToDeleteButton from "../components/HoldToDeleteButton";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import PushToggle from "../components/PushToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_HEAD,
  SECTION_TITLE,
  SECTION_BODY_PAD,
} from "@/lib/sectionClasses";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-px">
    {Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={cn(
          "h-3.5 w-3.5",
          i < n ? "text-amber-500" : "text-foreground/15",
        )}
      />
    ))}
  </span>
);

const subTabs = [
  // Ce que les autres voient de moi, en premier.
  { key: "profil", label: "Profil", adminOnly: false },
  { key: "avis", label: "Avis", adminOnly: false },
  { key: "succes", label: "Succès", adminOnly: false },
  // Suivi de ses propres signalements : l'envoi se fait depuis la navbar.
  { key: "retours", label: "Demandes", adminOnly: false },
  // Carnet de backlog : ce que l'admin repère en naviguant, pour plus tard.
  { key: "backlog", label: "Backlog", adminOnly: true },
  // Les réglages en dernier : on y va rarement.
  { key: "compte", label: "Compte", adminOnly: false },
] as const;

type SubTabKey = (typeof subTabs)[number]["key"];

const MyAccount = () => {
  const navigate = useNavigate();
  const { sessionData, signOut, error } = useSession();
  const { profile, uploadAvatar, removeAvatar } = useProfile();
  const { data: reviews = [], isPending: reviewsLoading } = useMyReviews();
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
  // Un ?tab= qui vise un onglet masqué (ou inconnu) retombe sur « Compte ».
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

  const [isDialogOpen, setDialogOpen] = useState(false);
  // Easter egg « Jour ! Nuit ! » : le GIF de Jacquouille remplace la carte
  // Compte, le temps qu'on change de sous-onglet (ou de page : démontage).
  const [jourNuit, setJourNuit] = useState(false);
  useEffect(() => {
    setJourNuit(false);
  }, [active]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const email = sessionData?.user?.email;
  const hasAvatar = !!profile?.avatar_path;

  const handleLogout = async () => {
    await signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error,
        status: "error",
        duration: 3000,
      });
    } else {
      navigate("/login");
    }
  };

  const handlePick = async (file?: File) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast({
        title: "Photo de profil mise à jour",
        status: "success",
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: "Échec",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleRemove = async () => {
    try {
      await removeAvatar.mutateAsync();
      toast({
        title: "Photo de profil retirée",
        status: "success",
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  // Contenu d'un sous-onglet (partagé par le fondu desktop et le pager mobile).
  const renderTab = (tab: SubTabKey) => (
    <>
      {/* Profil : la même page que celle qu'un collègue voit de moi. */}
      {tab === "profil" && sessionData?.user?.id && (
        <UserProfileView userId={sessionData.user.id} isMe />
      )}

      {/* Compte */}
      {tab === "compte" && (
        <Card className="relative overflow-hidden p-4 sm:p-8">
          {/* Easter egg : le GIF recouvre la carte en fondu, sans en changer la
      taille, et absorbe les clics tant qu'on reste sur ce sous-onglet. */}
          {jourNuit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-10 bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/easter/jour-nuit.gif"
                alt="Le jour, la nuit, le jour, la nuit…"
                className="h-full w-full object-cover"
              />
            </motion.div>
          )}
          {/* Thème clair/sombre : réglage personnel, il a sa place ici plutôt que
      dans la navbar où il occupait une position permanente. */}
          <ColorModeSwitch
            className="absolute right-3 top-3"
            onJourNuit={() => setJourNuit(true)}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar
                email={email}
                avatarPath={profile?.avatar_path}
                size={96}
                className="ring-2 ring-border"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                aria-label="Changer la photo de profil"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-60"
              >
                <FiCamera className="h-4 w-4" />
              </button>

              {/* Retrait de la pp : pastille en haut à droite, appui maintenu. */}
              {hasAvatar && (
                <HoldToDeleteButton
                  onConfirm={handleRemove}
                  title="Maintenir pour retirer la photo"
                  className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white shadow-md"
                  progressClassName="bg-white/40"
                >
                  <FiTrash2 className="h-4 w-4" />
                </HoldToDeleteButton>
              )}
            </div>

            <p className="text-foreground/70">{email}</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handlePick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="my-6 h-px bg-border" />

          <div className="flex flex-col gap-3">
            {isAdmin && <PushToggle />}
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Changer le mot de passe
            </Button>
            <Button variant="destructiveSoft" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </div>
        </Card>
      )}

      {/* Avis */}
      {tab === "avis" && (
        <section
          className={cn(
            SECTION,
            "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
          )}
        >
          <div className={SECTION_HEAD}>
            <div role="heading" aria-level={2} className={SECTION_TITLE}>
              Avis
              {reviews.length > 0 && (
                <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
                  ({reviews.length})
                </span>
              )}
            </div>
          </div>
          <div className={SECTION_BODY_PAD}>
            {reviewsLoading ? (
              <div className="flex justify-center py-5 sm:py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground/55">
                Tu n'as encore laissé aucun avis.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() =>
                        r.restaurant &&
                        navigate(`/restaurant/${r.restaurant.slug}`)
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-card-foreground">
                            {r.restaurant?.name ?? "Restaurant supprimé"}
                          </span>
                          <Stars n={r.rating} />
                          <span className="text-xs text-foreground/45">
                            · {formatDate(r.created_at)}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mb-0 mt-0.5 truncate text-sm text-foreground/70">
                            {r.comment}
                          </p>
                        )}
                      </div>
                      <FiChevronRight className="h-5 w-5 shrink-0 text-foreground opacity-30" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
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
        /* Desktop : carte de la sous-section active, en fondu. */
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
                className="h-full w-full shrink-0 space-y-3 overflow-y-auto overscroll-y-contain px-2.5 py-3"
              >
                {visited.has(t.key) && renderTab(t.key)}
              </div>
            ))}
          </div>
        </div>
      )}

      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default MyAccount;

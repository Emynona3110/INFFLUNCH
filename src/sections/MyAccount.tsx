import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { FiCamera, FiTrash2, FiChevronRight } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useSession from "../hooks/useSession";
import useProfile from "../hooks/useProfile";
import useMyReviews from "../hooks/useMyReviews";
import useAchievementsSeen from "../hooks/useAchievementsSeen";
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
        className={cn("h-3.5 w-3.5", i < n ? "text-amber-500" : "text-foreground/15")}
      />
    ))}
  </span>
);

const subTabs = [
  { key: "profil", label: "Compte", adminOnly: false },
  { key: "avis", label: "Avis", adminOnly: false },
  { key: "succes", label: "Succès", adminOnly: false },
  // Suivi de ses propres signalements : l'envoi se fait depuis la navbar.
  { key: "retours", label: "Demandes", adminOnly: false },
  // Carnet de backlog : ce que l'admin repère en naviguant, pour plus tard.
  { key: "backlog", label: "Backlog", adminOnly: true },
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
  const tabParam = searchParams.get("tab");
  const visibleTabs = subTabs.filter((t) => !t.adminOnly || isAdmin);
  // Un ?tab= qui vise un onglet masqué (ou inconnu) retombe sur « Compte ».
  const isTabKey = (v: string | null): v is SubTabKey =>
    visibleTabs.some((t) => t.key === v);
  const [active, setActive] = useState<SubTabKey>(() =>
    isTabKey(tabParam) ? tabParam : "profil"
  );
  useEffect(() => {
    if (isTabKey(tabParam)) setActive(tabParam);
  }, [tabParam]);

  // Pastille « succès non vus » : elle s'éteint dès qu'on ouvre la galerie.
  const { hasUnseen: hasUnseenAchievements, markSeen } = useAchievementsSeen();
  // Même signal côté « Demandes » : l'admin a classé une de mes demandes.
  const { hasUnseen: hasUnseenFeedback } = useFeedbackSeen();
  useEffect(() => {
    if (active === "succes") markSeen();
  }, [active, markSeen]);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const email = sessionData?.user?.email;
  const hasAvatar = !!profile?.avatar_path;

  const handleLogout = async () => {
    await signOut();
    if (error) {
      toast({ title: "Erreur de déconnexion", description: error, status: "error", duration: 3000 });
    } else {
      navigate("/login");
    }
  };

  const handlePick = async (file?: File) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast({ title: "Photo de profil mise à jour", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message ?? "Réessaie.", status: "error", duration: 5000 });
    }
  };

  const handleRemove = async () => {
    try {
      await removeAvatar.mutateAsync();
      toast({ title: "Photo de profil retirée", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Réessaie.", status: "error", duration: 5000 });
    }
  };

  return (
    <div className="tw-scope w-full">
      {/* Sous-sections (pills) collées sous la navbar, comme la section Admin. */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
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
                  : "bg-muted text-foreground/70 hover:bg-muted/70"
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

      {/* Carte de la sous-section active, centrée horizontalement. */}
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-2xl space-y-6"
      >
      {/* Profil */}
      {active === "profil" && (
      <Card className="relative p-8">
        {/* Thème clair/sombre : réglage personnel, il a sa place ici plutôt que
            dans la navbar où il occupait une position permanente. */}
        <ColorModeSwitch className="absolute right-3 top-3" />

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
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-60"
            >
              <FiCamera className="h-4 w-4" />
            </button>

            {/* Retrait de la pp : pastille en haut à droite, appui maintenu. */}
            {hasAvatar && (
              <HoldToDeleteButton
                onConfirm={handleRemove}
                title="Maintenir pour retirer la photo"
                className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-destructive text-white shadow-md"
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
      {active === "avis" && (
      <Card className="p-6">
        <div
          role="heading"
          aria-level={2}
          className="mb-4 font-display text-lg font-bold text-card-foreground"
        >
          Avis
          {reviews.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
              ({reviews.length})
            </span>
          )}
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-8">
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
                    r.restaurant && navigate(`/restaurant/${r.restaurant.slug}`)
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
      </Card>
      )}

      {/* Mes succès */}
      {active === "succes" && <AchievementsGallery />}

      {/* Mes demandes */}
      {active === "retours" && <MyFeedback />}

      {/* Backlog (admins) */}
      {active === "backlog" && isAdmin && <AdminNotes />}
      </motion.div>

      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default MyAccount;

import { FiLock } from "react-icons/fi";
import { Dialog } from "@/components/ui/dialog";
import Avatar from "@/components/Avatar";
import AuthorButton from "@/components/AuthorButton";
import useAchievementHolders from "@/hooks/useAchievementHolders";
import { Achievement, RARE_PERCENT } from "@/data/achievements";
import useUserNames from "@/hooks/useUserNames";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  achievement: Achievement | null;
  /** Le visiteur l'a lui-même obtenu : icône en couleur, condition révélée. */
  unlocked: boolean;
  /** La personne dont on regarde le succès l'a (profil d'un collègue) : un
   *  succès rare y prend son or même si le visiteur ne l'a pas. Par défaut,
   *  celui du visiteur (`unlocked`). */
  owned?: boolean;
  /** Condition telle qu'on peut la montrer (celle du catalogue, ou celle d'un
   *  secret déjà débloqué). Absente = « Succès secret ». */
  condition?: string;
  /** Pourcentage d'obtention global, une fois les stats chargées. */
  percent?: number;
  /** Progression du visiteur vers le palier (succès à compteur révélés) ;
   *  ignorée une fois le succès obtenu. */
  progress?: { value: number; goal: number };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Fiche d'un succès : sa condition, sa rareté, où en est le visiteur (« 12 /
 * 20 ») et la liste des collègues qui l'ont décroché, le dernier en tête.
 * Ouverte d'un clic sur un succès — la galerie de Mon compte comme le profil
 * d'un collègue. Un secret non obtenu garde sa condition pour lui, mais on
 * voit quand même qui l'a trouvé.
 */
const AchievementDialog = ({
  isOpen,
  onClose,
  achievement,
  unlocked,
  owned = unlocked,
  condition,
  percent,
  progress,
}: Props) => {
  const { nameOf } = useUserNames();
  const holders = useAchievementHolders(
    isOpen && achievement ? achievement.id : null,
  );

  if (!achievement) return null;
  const a = achievement;
  const revealed = unlocked || !a.secret;
  const done = progress ? Math.min(progress.value, progress.goal) : 0;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="max-w-sm"
      showClose
    >
      {/* L'illustration en grand, au-dessus du titre : c'est la récompense. */}
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl text-7xl",
            unlocked && !a.image && "bg-primary/10",
            !unlocked && "bg-muted/40 text-muted-foreground",
          )}
        >
          {unlocked ? (
            a.image ? (
              <img src={a.image} alt="" className="h-full w-full object-contain" />
            ) : (
              a.icon
            )
          ) : (
            <FiLock className="h-14 w-14" />
          )}
        </div>
        <div
          role="heading"
          aria-level={2}
          className="mt-3 font-display text-xl font-bold leading-tight text-card-foreground"
        >
          {a.title}
        </div>
        <p className="m-0 mt-0.5 text-sm leading-snug text-foreground/55">
          {revealed && condition ? condition : "Succès secret"}
        </p>
      </div>

      {/* Rareté façon Steam : la part de l'équipe qui l'a. */}
      {percent !== undefined && (
        <p className="m-0 mt-2 text-center text-xs text-foreground/45">
          {/* Rare et obtenu : le même or que le contour. */}
          <span
            className={cn(
              owned && percent < RARE_PERCENT && "rare-text font-semibold",
            )}
          >
            {percent.toFixed(1)} % des collègues l'ont débloqué
          </span>
        </p>
      )}

      {/* Progression : seulement tant que le palier n'est pas atteint, et
          pour ceux dont la condition est connue — un compteur trahirait la
          condition d'un secret. */}
      {!unlocked && revealed && progress && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-foreground/60">Progression</span>
            <span className="tabular-nums font-semibold text-foreground/70">
              {done} / {progress.goal}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
              style={{ width: `${(done / progress.goal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Débloqué par
          {holders.data && holders.data.length > 0 && (
            <span className="ml-1.5 font-medium normal-case tracking-normal">
              ({holders.data.length})
            </span>
          )}
        </p>
        {holders.isPending ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : holders.isError ? (
          <p className="m-0 mt-2 text-sm text-destructive">
            {holders.error.message}
          </p>
        ) : holders.data.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-foreground/50">
            Personne ne l'a encore décroché.
          </p>
        ) : (
          /* Longue liste : c'est elle qui défile, pas la popup. */
          <ul className="m-0 mt-2 max-h-[30dvh] list-none space-y-1.5 overflow-y-auto p-0">
            {holders.data.map((h) => (
              <li key={h.user_id} className="flex items-center gap-2.5">
                <Avatar email={h.email} avatarPath={h.avatar_path} size={28} />
                {/* Le nom mène au profil : on referme d'abord la popup. */}
                <AuthorButton
                  userId={h.user_id}
                  email={h.email}
                  onClick={onClose}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground"
                >
                  {nameOf(h.email)}
                </AuthorButton>
                <span className="shrink-0 text-xs tabular-nums text-foreground/45">
                  {formatDate(h.unlocked_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};

export default AchievementDialog;

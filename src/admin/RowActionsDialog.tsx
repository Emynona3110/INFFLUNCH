import { ReactNode, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface RowAction {
  key: string;
  label: string;
  /** Rôle visuel du bouton (le rouge reste réservé à ce qui détruit). */
  tone?: "default" | "primary" | "destructive";
  /** Action sensible : appui maintenu, comme elle l'était dans la table. */
  hold?: boolean;
  /** Libellé accessible de l'appui maintenu (défaut : « Maintenir pour … »). */
  holdTitle?: string;
  disabled?: boolean;
  /** Pourquoi l'action est indisponible — dit plutôt qu'un bouton mort. */
  disabledReason?: string;
  /**
   * Rendre la promesse de l'appel serveur : le bouton tourne jusqu'à la
   * réponse, et la popup se ferme ensuite. Une action qui n'attend rien (ouvrir
   * un formulaire, naviguer) ne retourne rien : la popup se ferme aussitôt.
   */
  onSelect: () => void | Promise<void>;
}

const TONES = {
  default: {
    button: "bg-muted text-foreground/80 hover:bg-muted/70",
    progress: "bg-foreground/10",
  },
  primary: {
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
    progress: "bg-white/25",
  },
  destructive: {
    button: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    progress: "bg-destructive/20",
  },
} as const;

/**
 * Actions d'une ligne de table admin, en popup — comme la fiche d'une demande
 * (FeedbackViewDialog) : on clique la ligne, on choisit quoi faire. Les tables
 * n'ont donc plus de colonne « Actions », qui mangeait la largeur et tenait mal
 * sur un téléphone.
 *
 * Les actions sensibles gardent leur appui maintenu, mais sans la validation
 * mobile du bouton (`mobileConfirm={false}`) : cette popup EST déjà le geste
 * délibéré qu'elle réclamait, et on ne veut pas de popup par-dessus la popup.
 *
 * La popup reste ouverte pendant l'appel serveur, bouton en attente, et se
 * ferme elle-même à la réponse : l'appelant n'a donc pas à la fermer. Une
 * action qui en ouvre une autre (confirmation, formulaire) l'ouvre simplement —
 * celle-ci disparaît dans le même rendu, jamais deux fenêtres empilées.
 */
const RowActionsDialog = ({
  open,
  onClose,
  title,
  subtitle,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions: RowAction[];
}) => {
  // Clé de l'action en cours : son bouton tourne, les autres sont gelés.
  const [running, setRunning] = useState<string | null>(null);

  const run = async (action: RowAction) => {
    const result = action.onSelect();
    if (result instanceof Promise) {
      setRunning(action.key);
      try {
        await result;
      } catch {
        /* l'appelant prévient déjà (toast) ; on referme quand même */
      } finally {
        setRunning(null);
      }
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      // Pas d'échappatoire pendant l'appel : l'action est partie, on attend
      // sa réponse (c'est elle qui referme).
      onClose={() => !running && onClose()}
      showClose={!running}
      closeOnOverlayClick
    >
      <DialogTitle>
        <span className="mr-8 block truncate">{title}</span>
      </DialogTitle>
      {subtitle && (
        <p className="mb-0 mt-1 text-sm text-foreground/50">{subtitle}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {actions.map((a) => {
          const tone = TONES[a.tone ?? "default"];
          // Une action en cours gèle tout le reste, y compris elle-même.
          const frozen = a.disabled || (!!running && running !== a.key);
          const className = cn(
            "flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition",
            tone.button,
            (frozen || running === a.key) && "pointer-events-none",
            frozen && "opacity-50"
          );
          return (
            <div key={a.key}>
              {a.hold ? (
                // Le bouton porte lui-même son attente (spinner à la place du
                // libellé) tant que la promesse de `run` n'est pas tenue.
                <HoldToDeleteButton
                  onConfirm={() => run(a)}
                  mobileConfirm={false}
                  disabled={frozen}
                  title={a.holdTitle ?? `Maintenir pour ${a.label.toLowerCase()}`}
                  className={className}
                  progressClassName={tone.progress}
                >
                  {a.label}
                </HoldToDeleteButton>
              ) : (
                <button
                  type="button"
                  onClick={() => void run(a)}
                  // Gelé, ou déjà parti : pas de second envoi (au clavier non
                  // plus, d'où `disabled` en plus de `pointer-events-none`).
                  disabled={frozen || running === a.key}
                  className={cn(className, !frozen && "cursor-pointer")}
                >
                  {running === a.key ? <Spinner /> : a.label}
                </button>
              )}
              {a.disabled && a.disabledReason && (
                <p className="mb-0 mt-1 text-center text-xs text-foreground/45">
                  {a.disabledReason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {actions.some((a) => a.hold && !a.disabled) && !running && (
        <p className="mb-0 mt-3 text-center text-xs text-foreground/40">
          Les actions sensibles demandent un appui maintenu.
        </p>
      )}
    </Dialog>
  );
};

export default RowActionsDialog;

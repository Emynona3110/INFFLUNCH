import { LuMapPinOff, LuSandwich } from "react-icons/lu";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { LunchOffReason } from "@/hooks/useLunchToday";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Raison déjà déclarée pour aujourd'hui (mise en avant), null sinon. */
  current: LunchOffReason | null;
  onPick: (reason: LunchOffReason) => void;
}

/**
 * « Pas de resto » : deux situations qu'on ne mélange plus. Être sur site sans
 * déjeuner au restaurant laisse la porte ouverte aux collègues (on se croise,
 * on rapporte quelque chose, on groupe une commande) ; être ailleurs, non. On
 * ne demande pas POURQUOI on est absent : le midi n'en a pas besoin.
 *
 * Deux choix plutôt que deux boutons de plus dans l'encart : sur mobile, trois
 * boutons côte à côte ne tiennent pas, et chaque cas mérite sa phrase.
 */
const LunchOffDialog = ({ open, onClose, current, onPick }: Props) => {
  const options: {
    reason: LunchOffReason;
    icon: typeof LuSandwich;
    label: string;
    hint: string;
  }[] = [
    {
      reason: "on_site",
      icon: LuSandwich,
      label: "Pas de restaurant",
      hint: "Je suis sur site : gamelle, plat apporté, ou je déjeune de mon côté.",
    },
    {
      reason: "away",
      icon: LuMapPinOff,
      label: "Pas sur site",
      hint: "Je ne suis pas sur site ce midi.",
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md overflow-hidden">
      <DialogTitle>Tu ne vas pas au restaurant ?</DialogTitle>

      <div className="mt-4 flex flex-col gap-2">
        {options.map(({ reason, icon: Icon, label, hint }) => (
          <button
            key={reason}
            type="button"
            onClick={() => onPick(reason)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-card border border-border p-3 text-left transition hover:bg-muted",
              reason === current && "border-primary bg-primary/5"
            )}
          >
            {/* Opacité sur le svg, pas d'alpha sur la couleur : les traits
                croisés de LuMapPinOff se superposeraient sinon (cf. OffTable). */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5">
              <Icon className="h-5 w-5 text-foreground opacity-55" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold text-card-foreground">
                {label}
              </span>
              <span className="mt-0.5 block text-xs text-foreground/55">
                {hint}
              </span>
            </span>
            {reason === current && (
              <span className="shrink-0 text-xs font-semibold text-primary">
                Mon choix
              </span>
            )}
          </button>
        ))}
      </div>
    </Dialog>
  );
};

export default LunchOffDialog;

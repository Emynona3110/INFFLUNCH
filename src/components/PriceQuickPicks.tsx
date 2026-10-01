import { formatAmount } from "@/services/price";
import { cn } from "@/lib/utils";

interface Props {
  /** Montants à proposer, en euros (cf. quickPriceSuggestions). */
  values: number[];
  onPick: (value: number) => void;
  /** Montant déjà retenu : la pastille correspondante reste allumée. */
  selected?: number | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Rangée de montants cliquables : un tap vaut une déclaration, là où saisir
 * « 15 » au clavier numérique en demande quatre (ouvrir le pavé, taper,
 * refermer, valider). C'est la friction qu'on retire, pas la question.
 *
 * Pastilles PLEINES à la sélection, creuses au repos — même grammaire que
 * PriceTag, dont elles affichent les montants.
 */
const PriceQuickPicks = ({
  values,
  onPick,
  selected = null,
  disabled = false,
  className,
}: Props) => (
  <div className={cn("flex flex-wrap gap-2", className)}>
    {values.map((value) => {
      const active = selected != null && selected === value;
      return (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(value)}
          aria-pressed={active}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-semibold leading-none tabular-nums transition disabled:cursor-not-allowed disabled:opacity-50",
            active
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground/80 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          )}
        >
          {formatAmount(value)} €
        </button>
      );
    })}
  </div>
);

export default PriceQuickPicks;

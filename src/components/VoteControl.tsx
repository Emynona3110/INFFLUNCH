import { FiArrowUp, FiArrowDown } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  /** Vote courant : 1 (up), -1 (down) ou 0 (aucun). */
  myVote: number;
  onVote: (value: 1 | -1) => void;
  /** Lecture seule (non connecté, ou son propre avis). */
  disabled?: boolean;
}

const scoreColor = (score: number) =>
  score > 0 ? "text-[#f79220]" : score < 0 ? "text-primary" : "text-foreground/55";

/**
 * Contrôle de vote style Reddit : flèche haut, score, flèche bas. La flèche
 * active est colorée (up = orange, down = bleu).
 *
 * NB : l'état « inactif » est grisé via `opacity` (et non une couleur semi-
 * transparente type text-foreground/40). Sur une icône à traits (Feather), une
 * couleur en alpha cumule l'opacité là où les traits se chevauchent (pointe de
 * flèche) → point plus sombre. `opacity` composite l'icône entière une seule
 * fois → gris uniforme.
 */
const VoteControl = ({ score, myVote, onVote, disabled }: Props) => (
  <div className="inline-flex items-center gap-0.5">
    <button
      type="button"
      disabled={disabled}
      aria-label="Upvote"
      aria-pressed={myVote === 1}
      onClick={(e) => {
        e.stopPropagation();
        onVote(1);
      }}
      className={cn(
        "group grid h-5 w-5 place-items-center rounded-full p-0 transition",
        myVote === 1 ? "text-[#f79220]" : "text-foreground",
        !disabled && "cursor-pointer hover:bg-muted hover:text-[#f79220]"
      )}
    >
      <FiArrowUp
        className={cn(
          "h-3 w-3",
          disabled
            ? "opacity-40"
            : myVote === 1
              ? "opacity-100"
              : "opacity-40 group-hover:opacity-100"
        )}
      />
    </button>

    <span
      className={cn(
        "min-w-4 text-center text-[11px] font-semibold tabular-nums",
        scoreColor(score)
      )}
    >
      {score}
    </span>

    <button
      type="button"
      disabled={disabled}
      aria-label="Downvote"
      aria-pressed={myVote === -1}
      onClick={(e) => {
        e.stopPropagation();
        onVote(-1);
      }}
      className={cn(
        "group grid h-5 w-5 place-items-center rounded-full p-0 transition",
        myVote === -1 ? "text-primary" : "text-foreground",
        !disabled && "cursor-pointer hover:bg-muted hover:text-primary"
      )}
    >
      <FiArrowDown
        className={cn(
          "h-3 w-3",
          disabled
            ? "opacity-40"
            : myVote === -1
              ? "opacity-100"
              : "opacity-40 group-hover:opacity-100"
        )}
      />
    </button>
  </div>
);

export default VoteControl;

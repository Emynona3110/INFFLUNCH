import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { REACTION_EMOJIS, ReactionSummary } from "@/hooks/useReactions";
import { cn } from "@/lib/utils";

interface Props {
  summary: ReactionSummary;
  onToggle: (emoji: string) => void;
  /** Lecture seule (non connecté, ou sa propre photo) : pas de bouton « + ». */
  disabled?: boolean;
  /** Style clair sur fond sombre (lightbox photo). */
  onDark?: boolean;
}

/**
 * Réactions emoji style Discord : les emojis déjà posés s'affichent en chips
 * (cliquables pour (dé)réagir) et un bouton « + » ouvre un sélecteur d'emojis.
 * En lecture seule, seuls les chips existants sont montrés (non cliquables).
 */
const EmojiReactions = ({ summary, onToggle, disabled, onDark }: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const reacted = Object.entries(summary.counts).filter(([, n]) => n > 0);

  if (disabled && reacted.length === 0) return null;

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {reacted.map(([emoji, count]) => {
        const mine = summary.mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-pressed={mine}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onToggle(emoji);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition",
              mine
                ? "border-primary/40 bg-primary/10 text-primary"
                : onDark
                  ? "border-white/25 text-white/80"
                  : "border-border text-foreground/60",
              disabled
                ? "cursor-default"
                : cn("cursor-pointer", onDark ? "hover:bg-white/15" : "hover:bg-muted")
            )}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </button>
        );
      })}

      {!disabled && (
        <>
          <button
            type="button"
            aria-label="Ajouter une réaction"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((o) => !o);
            }}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border leading-none transition",
              onDark
                ? "border-white/25 text-white/80 hover:bg-white/15"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <FiPlus className="h-4 w-4" />
          </button>

          {pickerOpen && (
            <>
              {/* Capture le clic extérieur pour fermer le sélecteur. */}
              <div
                className="fixed inset-0 z-[1]"
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerOpen(false);
                }}
              />
              <div
                className="absolute bottom-full left-0 z-[2] mb-1.5 flex w-[200px] flex-wrap gap-1 rounded-xl border border-border bg-card p-2 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggle(emoji);
                      setPickerOpen(false);
                    }}
                    className={cn(
                      "grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-lg transition hover:bg-muted",
                      summary.mine.has(emoji) && "bg-primary/10"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EmojiReactions;

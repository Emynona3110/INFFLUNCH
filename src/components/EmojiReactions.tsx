import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuSmilePlus } from "react-icons/lu";
import { REACTION_EMOJIS, ReactionSummary } from "@/hooks/useReactions";
import { cn } from "@/lib/utils";

interface Props {
  summary: ReactionSummary;
  onToggle: (emoji: string) => void;
  /** Lecture seule (non connecté) : pas de bouton « Réagir ». */
  disabled?: boolean;
  /** Style clair sur fond sombre (visionneuse photo). */
  onDark?: boolean;
}

/** Marge minimale entre la palette et le bord de la fenêtre. */
const EDGE = 8;

/**
 * Réactions emoji façon messagerie : les emojis déjà posés s'affichent en chips
 * (cliquables pour (dé)réagir) et un bouton « Réagir » déploie la palette
 * entière — un seul clic suffit alors, là où il fallait auparavant ouvrir un
 * sélecteur puis viser. En lecture seule, seuls les chips sont montrés.
 */
const EmojiReactions = ({ summary, onToggle, disabled, onDark }: Props) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Décalage horizontal de la palette, dans le repère du bouton : centrée sur
  // lui, puis ramenée dans la fenêtre si elle en sort.
  const [left, setLeft] = useState(0);

  // Mesuré avant peinture : la palette est déjà à sa place au premier rendu.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const bar = barRef.current;
      const anchor = anchorRef.current;
      if (!bar || !anchor) return;
      const barWidth = bar.offsetWidth;
      const anchorBox = anchor.getBoundingClientRect();
      let x = anchorBox.width / 2 - barWidth / 2;
      const screenLeft = anchorBox.left + x;
      const overflowLeft = EDGE - screenLeft;
      const overflowRight = screenLeft + barWidth - (window.innerWidth - EDGE);
      if (overflowLeft > 0) x += overflowLeft;
      else if (overflowRight > 0) x -= overflowRight;
      setLeft(x);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Le plus soutenu en tête : on voit l'ambiance avant le détail.
  const reacted = Object.entries(summary.counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (disabled && reacted.length === 0) return null;

  const pick = (emoji: string) => {
    onToggle(emoji);
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
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
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition",
              mine
                ? "border-primary/40 bg-primary/10 text-primary"
                : onDark
                  ? "border-white/25 text-white/80"
                  : "border-border text-foreground/60",
              disabled
                ? "cursor-default"
                : cn(
                    "cursor-pointer",
                    onDark ? "hover:bg-white/15" : "hover:bg-muted"
                  )
            )}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </button>
        );
      })}

      {!disabled && (
        // `relative` sur le bouton lui-même : la palette s'ancre dessus, pas
        // sur la rangée entière (dont la largeur varie avec les chips).
        <div ref={anchorRef} className="relative">
          <button
            type="button"
            aria-label="Réagir"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition",
              open
                ? "border-primary/40 bg-primary/10 text-primary"
                : onDark
                  ? "border-white/25 text-white/80 hover:bg-white/15"
                  : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <LuSmilePlus className="h-[18px] w-[18px]" />
            Réagir
          </button>

          {/* Capture le clic extérieur pour refermer la palette. Hors de
              l'AnimatePresence, qui ne suit que des composants animés. */}
          {open && (
            <div
              className="fixed inset-0 z-[1]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
          )}

          <AnimatePresence>
            {open && (
              <motion.div
                ref={barRef}
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.94 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                // `left` plutôt qu'une translation : framer-motion écrit la
                // transform pour animer, et écraserait un centrage posé là.
                style={{
                  originY: 1,
                  left,
                  maxWidth: `calc(100vw - ${2 * EDGE}px)`,
                }}
                className="absolute bottom-full z-[2] mb-2 flex gap-1 rounded-full border border-border bg-card p-1.5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.14 }}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => pick(emoji)}
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full ring-inset transition-colors hover:bg-primary/15",
                      summary.mine.has(emoji)
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "ring-1 ring-border"
                    )}
                  >
                    {/* L'emoji repose sur sa ligne de base : sans ce demi-cran
                        vers le haut, il flotte sous le centre du cercle. */}
                    <span className="block -translate-y-[1px] text-2xl leading-none">
                      {emoji}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default EmojiReactions;

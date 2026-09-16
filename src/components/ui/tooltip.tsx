import { useState } from "react";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Radix ferme la bulle au clic sur le déclencheur ; à `true`, elle reste
   *  (utile quand le clic ne mène nulle part et que la bulle EST l'info). */
  keepOnClick?: boolean;
}

/**
 * Tooltip porté (Radix) conservant une API proche de l'ancien Tooltip Chakra :
 * <Tooltip label="...">{trigger}</Tooltip>. Bulle foreground/background (dual-mode),
 * portée hors du flux → pas de clipping dans les cards (overflow-hidden).
 */
/** Écran tactile sans survol : Radix n'ouvre jamais la bulle au toucher,
 *  on la pilote nous-mêmes (tap = ouverture, tap ailleurs = fermeture). */
const isTouch =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(hover: none)").matches;

export function Tooltip({ label, children, side = "top", keepOnClick }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={isTouch ? open : undefined}>
        <TooltipPrimitive.Trigger
          asChild
          // Radix compose ses handlers après les nôtres et s'abstient si
          // l'évènement est `defaultPrevented` : c'est le levier pour garder
          // la bulle ouverte au clic.
          onPointerDown={keepOnClick ? (e) => e.preventDefault() : undefined}
          onClick={(e) => {
            if (keepOnClick) e.preventDefault();
            if (isTouch) setOpen(true);
          }}
        >
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            // Troisième fermeture : la bulle est une DismissableLayer et un
            // clic sur le déclencheur compte comme « en dehors » d'elle.
            onPointerDownOutside={(e) => {
              if (isTouch) setOpen(false);
              else if (keepOnClick) e.preventDefault();
            }}
            className="z-[1200] select-none rounded-md bg-foreground px-2.5 py-1 font-sans text-xs font-medium text-background shadow-md animate-[tooltip-in_120ms_ease-out]"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

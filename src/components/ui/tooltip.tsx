import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Tooltip porté (Radix) conservant une API proche de l'ancien Tooltip Chakra :
 * <Tooltip label="...">{trigger}</Tooltip>. Bulle foreground/background (dual-mode),
 * portée hors du flux → pas de clipping dans les cards (overflow-hidden).
 */
export function Tooltip({ label, children, side = "top" }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-[1200] select-none rounded-md bg-foreground px-2.5 py-1 font-sans text-xs font-medium text-background shadow-md animate-[tooltip-in_120ms_ease-out]"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

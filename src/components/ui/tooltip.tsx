import { useEffect, useState } from "react";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Radix ferme la bulle au clic sur le déclencheur ; à `true`, elle reste
   *  (utile quand le clic ne mène nulle part et que la bulle EST l'info). */
  keepOnClick?: boolean;
  /** Bulle forcée fermée (ex. : la fiche que le déclencheur a ouverte est à
   *  l'écran — la bulle restait parfois affichée par-dessus). */
  disabled?: boolean;
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

export function Tooltip({
  label,
  children,
  side = "top",
  keepOnClick,
  disabled,
}: TooltipProps) {
  // Toujours contrôlée : passer de contrôlée à libre (via `disabled`)
  // ressortait l'ancien état interne de Radix, bulle ouverte comprise.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  // Tactile : pas de bulle de survol (elle restait affichée sous les popups
  // ouvertes par le tap). Seules les bulles « qui sont l'info » (keepOnClick)
  // gardent l'ouverture au tap.
  if (isTouch && !keepOnClick) return <>{children}</>;
  return (
    // `disableHoverableContent` + `pointer-events-none` : la bulle n'est que de
    // l'info. Survolable, elle restait ouverte sous la souris et masquait ce
    // qu'elle recouvre (le succès du dessus, sur un profil, n'était plus
    // cliquable).
    <TooltipPrimitive.Provider delayDuration={150} disableHoverableContent>
      <TooltipPrimitive.Root
        open={open && !disabled}
        // Tactile : seul le tap (onClick) ouvre ; ailleurs, Radix pilote.
        onOpenChange={isTouch ? undefined : setOpen}
      >
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
            className="pointer-events-none z-[1200] select-none rounded-md bg-foreground px-2.5 py-1 font-sans text-xs font-medium text-background shadow-md animate-[tooltip-in_120ms_ease-out]"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

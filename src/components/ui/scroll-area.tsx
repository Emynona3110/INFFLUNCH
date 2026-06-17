import { CSSProperties, ReactNode } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { PartialOptions } from "overlayscrollbars";
import { cn } from "@/lib/utils";

/**
 * Zone scrollable avec barres OverlayScrollbars : elles flottent par-dessus le
 * contenu (aucune gouttière/fond), fines, auto-masquées (thème .os-infflunch).
 * `options` permet de piloter les axes ; `style` permet de passer des variables
 * CSS (ex. décalage des barres en mode "grille figée").
 */
export function ScrollArea({
  children,
  className,
  style,
  options,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  options?: PartialOptions;
}) {
  return (
    <OverlayScrollbarsComponent
      defer
      options={{
        scrollbars: {
          autoHide: "leave",
          autoHideDelay: 250,
          theme: "os-infflunch",
        },
        ...options,
      }}
      className={cn("os-infflunch", className)}
      style={style}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}

import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Puce orange : quelque chose attend derrière cette entrée. */
  dot?: boolean;
  /** Survol / toucher : données de la page chargées d'avance. */
  onPrefetch?: () => void;
}

interface Props {
  /** Nom du menu : infobulle et libellé accessible du bouton. */
  label: string;
  /** Contenu du bouton (icône, avatar). */
  children: ReactNode;
  items: NavMenuItem[];
  /** Puce sur le bouton (une entrée au moins en a une). */
  dot?: boolean;
  /** Bouton surligné : la page courante est dans ce menu. */
  active?: boolean;
  className?: string;
}

/**
 * Menu déroulant des icônes de droite de la navbar (aide, compte). Se ferme
 * au choix d'une entrée, au clic ailleurs et à Échap.
 */
const NavMenu = ({ label, children, items, dot, active, className }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Infobulle coupée menu ouvert : elle passerait par-dessus. */}
      <Tooltip label={label} disabled={open}>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-muted sm:h-9 sm:w-9",
            active || open
              ? "text-primary"
              : "text-muted-foreground hover:text-primary",
            className,
          )}
        >
          {children}
          {dot && (
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#ea580c] ring-2 ring-card" />
          )}
        </button>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ originX: 1, originY: 0 }}
            className="absolute right-0 top-full z-30 mt-1.5 flex w-max flex-col gap-0.5 rounded-2xl border border-border bg-card p-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onMouseEnter={item.onPrefetch}
                onTouchStart={item.onPrefetch}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl pl-3 pr-5 py-2 text-left text-sm font-medium text-card-foreground transition hover:bg-muted"
              >
                {item.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-foreground opacity-50 [&>svg]:h-4 [&>svg]:w-4">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.dot && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavMenu;

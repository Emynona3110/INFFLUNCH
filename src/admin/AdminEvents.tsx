import { useState } from "react";
import {
  EVENTS,
  PREVIEW_KEY,
  PREVIEW_NONE,
  scheduledEvent,
} from "@/events/calendar";
import { cn } from "@/lib/utils";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 10-24 » → « 24 oct. » */
const day = (md: string) => {
  const [m, d] = md.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

const readPreview = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
};

/**
 * Onglet admin « Évènements » : choisir ce que CE navigateur affiche —
 * le calendrier (comme tout le monde), un évènement en avance pour le
 * vérifier, ou aucun. L'évènement est choisi au chargement de la page
 * (index.html) : la page se recharge pour l'appliquer.
 */
const AdminEvents = () => {
  const [preview] = useState(readPreview);
  const scheduled = scheduledEvent();
  const scheduledLabel =
    EVENTS.find((e) => e.id === scheduled)?.label ?? "aucun évènement";

  const choose = (value: string | null) => {
    if (value === preview) return;
    try {
      if (value === null) localStorage.removeItem(PREVIEW_KEY);
      else localStorage.setItem(PREVIEW_KEY, value);
    } catch {
      return;
    }
    location.reload();
  };

  const options: { value: string | null; title: string; detail: string }[] = [
    {
      value: null,
      title: "Selon le calendrier",
      detail: `Aujourd'hui : ${scheduledLabel}.`,
    },
    ...EVENTS.map((e) => ({
      value: e.id as string,
      title: `Aperçu : ${e.label}`,
      detail: `Période : du ${day(e.from)} au ${day(e.to)}${scheduled === e.id ? " (en cours)" : ""}.`,
    })),
    {
      value: PREVIEW_NONE,
      title: "Aucun évènement",
      detail: "Affichage par défaut.",
    },
  ];

  return (
    <div className="tw-scope flex h-full w-full flex-col overflow-y-auto sm:px-4 sm:pb-4">
      <div className="w-full max-w-xl">
        <div role="radiogroup" aria-label="Évènement affiché" className="flex flex-col gap-2">
          {options.map((o) => {
            const selected = o.value === preview;
            return (
              <button
                key={o.value ?? "calendrier"}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-card border bg-card p-3 text-left transition",
                  selected
                    ? "border-primary"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-primary" : "border-foreground/30",
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-card-foreground">
                    {o.title}
                  </span>
                  <span className="block text-xs text-foreground/60">{o.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;

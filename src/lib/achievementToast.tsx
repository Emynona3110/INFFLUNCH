import { toast as sonner } from "sonner";
import { Achievement } from "@/data/achievements";

/**
 * Toast de déblocage de succès, style Steam : icône + « Succès débloqué » +
 * intitulé. Sans son (pour le moment).
 * On rend une carte custom (pas les couleurs sonner par défaut) et on la scope
 * à `.tw-scope` car le toast est monté hors de la zone Tailwind de l'app.
 */
export function showAchievementToast(a: Achievement) {
  sonner.custom(
    () => (
      <div className="tw-scope flex w-[330px] items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
          {a.image ? (
            <img src={a.image} alt="" className="h-9 w-9 object-contain" />
          ) : (
            a.icon
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold uppercase leading-tight tracking-wide text-primary">
            Succès débloqué
          </p>
          <p className="m-0 truncate text-sm font-bold leading-tight text-foreground">{a.title}</p>
        </div>
      </div>
    ),
    { duration: 5000, unstyled: true }
  );
}

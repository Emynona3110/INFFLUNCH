import { LuUtensils, LuUtensilsCrossed } from "react-icons/lu";
import useLunchToday, { isWeekend } from "@/hooks/useLunchToday";
import { useLateLunchConfirm } from "@/components/LateLunchConfirm";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  className?: string;
}

/**
 * Bascule « Je déjeune ici » de la fiche restaurant. On n'a qu'une intention
 * par jour : cliquer ici depuis un autre restaurant déplace simplement son
 * choix (upsert côté hook).
 */
const LunchButton = ({ restaurantId, className }: Props) => {
  const { hasPlan, myRestaurantId, saving, setLunch, clearLunch } =
    useLunchToday();
  // Même garde-fou que la page du midi : après 14 h, on ne défait pas sa
  // journée d'un clic. La fiche resto est le second endroit d'où l'on peut
  // basculer son midi, elle ne peut pas être la porte dérobée.
  const { confirmLateChange, lateLunchDialog } = useLateLunchConfirm();
  const active = myRestaurantId === restaurantId;
  // Week-end : personne ne déjeune au bureau, on cesse d'y inviter. Le bouton
  // reste cliquable (se déclarer un samedi n'est pas interdit, cf. isWeekend),
  // il s'éteint simplement et passe aux couverts croisés — même signal que
  // l'encart de la page du midi. Un choix déjà posé ici garde son bouton
  // allumé, sinon on ne pourrait plus l'annuler franchement.
  const weekendOff = !active && isWeekend();

  const apply = async () => {
    try {
      if (active) {
        await clearLunch();
        toast({ title: "Tu ne déjeunes plus ici", status: "success", duration: 2000 });
      } else {
        await setLunch(restaurantId);
        toast({ title: "C'est noté pour ce midi", status: "success", duration: 2000 });
      }
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : String(e),
        status: "error",
        duration: 5000,
      });
    }
  };

  const onClick = () =>
    confirmLateChange(active ? "clear" : "switch", hasPlan, apply);

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        aria-pressed={active}
        aria-label={
          active
            ? "J'y déjeune"
            : weekendOff
              ? "Je déjeune ici (c'est le week-end)"
              : "Je déjeune ici"
        }
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-full p-2.5 text-sm font-medium transition disabled:opacity-60 sm:px-4",
          active
            ? // Bordure transparente : même hauteur qu'inactif, rien ne bouge.
              "border border-transparent bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            : weekendOff
              ? "border border-border bg-muted/40 text-foreground/45 hover:bg-muted hover:text-foreground/70"
              : "border border-border bg-card text-foreground hover:bg-muted",
          className
        )}
      >
        {weekendOff ? (
          <LuUtensilsCrossed className="h-4 w-4" />
        ) : (
          <LuUtensils className="h-4 w-4" />
        )}
        {/* Mobile : icône seule. */}
        <span className="hidden sm:inline">
          {active ? "J'y déjeune" : "Je déjeune ici"}
        </span>
      </button>

      {lateLunchDialog}
    </>
  );
};

export default LunchButton;

import { LuUtensils } from "react-icons/lu";
import useLunchToday from "@/hooks/useLunchToday";
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
  const { myRestaurantId, saving, setLunch, clearLunch } = useLunchToday();
  const active = myRestaurantId === restaurantId;

  const onClick = async () => {
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:opacity-60",
        active
          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          : "border border-border bg-card text-foreground hover:bg-muted",
        className
      )}
    >
      <LuUtensils className="h-4 w-4" />
      {active ? "J'y déjeune" : "Je déjeune ici"}
    </button>
  );
};

export default LunchButton;

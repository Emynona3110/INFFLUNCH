import { LuShoppingBag } from "react-icons/lu";
import useLunchToday from "@/hooks/useLunchToday";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  /** Page de commande en ligne (click & collect). */
  url: string;
  className?: string;
}

/**
 * « Commander » : ouvre la page click & collect du restaurant dans un nouvel
 * onglet ET note qu'on y déjeune — commander, c'est décider où l'on mange.
 * L'onglet s'ouvre AVANT l'écriture en base : après un `await`, les
 * navigateurs bloquent les popups.
 */
const OrderButton = ({ restaurantId, url, className }: Props) => {
  const { myRestaurantId, saving, setLunch } = useLunchToday();

  const onClick = async () => {
    window.open(url, "_blank", "noopener,noreferrer");
    if (myRestaurantId === restaurantId) return;
    try {
      await setLunch(restaurantId);
      toast({ title: "C'est noté pour ce midi", status: "success", duration: 2000 });
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
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60",
        className
      )}
    >
      <LuShoppingBag className="h-4 w-4" />
      Commander
    </button>
  );
};

export default OrderButton;

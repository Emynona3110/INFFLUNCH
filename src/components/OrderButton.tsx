import { LuShoppingBag } from "react-icons/lu";
import { cn } from "@/lib/utils";

interface Props {
  /** Page de commande en ligne (click & collect). */
  url: string;
  className?: string;
}

/**
 * « Commander » : ouvre la page click & collect du restaurant dans un nouvel
 * onglet. Rien d'autre — déclarer son déjeuner reste un geste à part.
 */
const OrderButton = ({ url, className }: Props) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground no-underline transition hover:bg-muted hover:no-underline",
      className
    )}
  >
    <LuShoppingBag className="h-4 w-4" />
    Commander
  </a>
);

export default OrderButton;

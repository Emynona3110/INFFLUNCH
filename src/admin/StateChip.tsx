import { IconType } from "react-icons";
import { cn } from "@/lib/utils";

interface Props {
  state: {
    label: string;
    chip: string;
    Icon: IconType;
    /** Pour une pastille en couleur semi-transparente : couleur PLEINE +
     *  opacité sur l'icône, sinon ses croisements de traits s'assombrissent. */
    iconClass?: string;
  };
}

/** Pastille d'état des tables admin : libellé à partir de sm, icône seule sur
 *  mobile (place comptée), le libellé restant lu par les lecteurs d'écran. */
const StateChip = ({ state }: Props) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full p-1 text-xs font-medium sm:px-2.5 sm:py-0.5",
      state.chip,
    )}
  >
    <state.Icon
      aria-hidden
      className={cn("h-3.5 w-3.5 sm:hidden", state.iconClass)}
    />
    <span className="sr-only sm:not-sr-only">{state.label}</span>
  </span>
);

export default StateChip;

import { BsMoonFill, BsSunFill } from "react-icons/bs";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import useAchievements from "@/hooks/useAchievements";

/** Succès « Jour ! Nuit ! » : bascules rapprochées (moins de 2 s entre deux),
 *  comptées au niveau module pour survivre aux re-rendus de la navbar. */
const JOUR_NUIT_TOGGLES = 8;
const JOUR_NUIT_GAP_MS = 2000;
let toggleRun = 0;
let lastToggleAt = 0;

interface Props {
  className?: string;
  /** Appelé au moment précis où la condition « Jour ! Nuit ! » est atteinte
   *  (à chaque fois, succès déjà obtenu ou non) — pour l'easter egg visuel. */
  onJourNuit?: () => void;
}

const ColorModeSwitch = ({ className, onJourNuit }: Props) => {
  const { theme, toggleTheme } = useTheme();
  const { unlock } = useAchievements();

  const onToggle = () => {
    toggleTheme();
    const now = Date.now();
    toggleRun = now - lastToggleAt < JOUR_NUIT_GAP_MS ? toggleRun + 1 : 1;
    lastToggleAt = now;
    if (toggleRun === JOUR_NUIT_TOGGLES) {
      unlock("jour_nuit");
      onJourNuit?.();
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Changer le thème"
      className={cn(
        "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary",
        className
      )}
    >
      {theme === "light" ? (
        <BsMoonFill className="h-[18px] w-[18px]" />
      ) : (
        <BsSunFill className="h-[22px] w-[22px]" />
      )}
    </button>
  );
};

export default ColorModeSwitch;

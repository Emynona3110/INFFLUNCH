import { BsMoonFill, BsSunFill } from "react-icons/bs";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ColorModeSwitch = ({ className }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
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

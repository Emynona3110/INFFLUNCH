import { FaHeart, FaRegHeart } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface FavoritesToggleProps {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

const FavoritesToggle = ({ isChecked, onChange }: FavoritesToggleProps) => {
  return (
    <button
      type="button"
      aria-label="Afficher uniquement les favoris"
      aria-pressed={isChecked}
      onClick={() => onChange(!isChecked)}
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:bg-muted sm:h-10 sm:w-10",
        isChecked ? "text-[#ff6b81]" : "text-foreground/60 hover:text-[#ff6b81]"
      )}
    >
      {isChecked ? (
        <FaHeart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
      ) : (
        <FaRegHeart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
      )}
    </button>
  );
};

export default FavoritesToggle;

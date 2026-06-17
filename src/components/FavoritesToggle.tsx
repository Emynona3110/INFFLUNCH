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
        "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition hover:bg-muted",
        isChecked ? "text-[#ff6b81]" : "text-foreground/60 hover:text-[#ff6b81]"
      )}
    >
      {isChecked ? (
        <FaHeart className="h-5 w-5" />
      ) : (
        <FaRegHeart className="h-5 w-5" />
      )}
    </button>
  );
};

export default FavoritesToggle;

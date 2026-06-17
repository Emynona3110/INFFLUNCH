import { cn } from "@/lib/utils";

interface BadgeButtonProps {
  label: string;
  src: string;
  isActive: boolean;
  onToggle: () => void;
}

const BadgeButton = ({ label, src, isActive, onToggle }: BadgeButtonProps) => (
  <button
    type="button"
    onClick={onToggle}
    title={label}
    aria-label={label}
    aria-pressed={isActive}
    className={cn(
      "grid h-12 w-12 cursor-pointer place-items-center rounded-xl border transition duration-200",
      isActive
        ? "border-primary/40 bg-primary/10"
        : "border-transparent opacity-45 grayscale hover:opacity-75"
    )}
  >
    <img src={src} alt={label} className="h-7 w-7 object-contain" />
  </button>
);

export default BadgeButton;

import BadgeButton from "./BadgeButton";
import badgeMap from "../services/badgeMap";
import { cn } from "@/lib/utils";

interface BadgesTogglesProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Classes ajoutées au conteneur flex (ex. "justify-center"). */
  className?: string;
  /** Badges à ne pas proposer (ceux que la base pose elle-même). */
  exclude?: string[];
}

const BadgesToggles = ({ selected, onChange, className, exclude = [] }: BadgesTogglesProps) => {
  const toggleBadge = (label: string) => {
    const isSelected = selected.includes(label);
    const updated = isSelected
      ? selected.filter((b) => b !== label)
      : [...selected, label];

    // Respecter l'ordre de badgeMap
    const ordered = Object.keys(badgeMap).filter((b) => updated.includes(b));
    onChange(ordered);
  };

  return (
    <div className={cn("tw-scope flex flex-wrap gap-3", className)}>
      {Object.entries(badgeMap)
        .filter(([label]) => !exclude.includes(label))
        .map(([label, src]) => (
        <BadgeButton
          key={label}
          label={label}
          src={src}
          isActive={selected.includes(label)}
          onToggle={() => toggleBadge(label)}
        />
      ))}
    </div>
  );
};

export default BadgesToggles;

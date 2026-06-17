import BadgeButton from "./BadgeButton";
import badgeMap from "../services/badgeMap";

interface BadgesTogglesProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

const BadgesToggles = ({ selected, onChange }: BadgesTogglesProps) => {
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
    <div className="tw-scope flex flex-wrap gap-3">
      {Object.entries(badgeMap).map(([label, src]) => (
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

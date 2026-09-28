import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Décrit chaque poignée pour les lecteurs d'écran (« Prix minimum »…). */
  labels?: [string, string];
  className?: string;
}

/**
 * Curseur à deux poignées (Radix), stylé sur les tokens du design system.
 * Les poignées peuvent se rejoindre mais pas se croiser (`minStepsBetweenThumbs`
 * à 0 : une plage réduite à un seul euro reste un choix valable).
 */
export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 50,
  step = 1,
  labels,
  className,
}: RangeSliderProps) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={0}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        className,
      )}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      {[0, 1].map((i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={labels?.[i]}
          className="block h-4 w-4 cursor-grab rounded-full border-2 border-primary bg-card shadow-sm transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

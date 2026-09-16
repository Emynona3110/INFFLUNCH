import { useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  tags: string[];
  /** Plafond de tags visibles, en plus de la contrainte de largeur. */
  max?: number;
  className?: string;
}

/** Écart horizontal entre pills (gap-1.5). */
const GAP = 6;

/**
 * Tags sur UNE seule ligne : on rend toutes les pills, on mesure ce qui tient
 * dans la largeur disponible et on cache le reste derrière un « +N » (infobulle
 * avec les tags masqués). Les pills cachées restent dans le DOM, hors flux et
 * invisibles, pour pouvoir être mesurées à chaque redimensionnement.
 */
const TagsOneLine = ({ tags, max = Infinity, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(Math.min(tags.length, max));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      const pills = Array.from(el.querySelectorAll<HTMLElement>("[data-tag]"));
      const more = el.querySelector<HTMLElement>("[data-more]");
      const moreWidth = more ? more.offsetWidth + GAP : 0;
      const cap = Math.min(pills.length, max);

      let used = 0;
      let fit = 0;
      for (let i = 0; i < cap; i++) {
        const w = pills[i].offsetWidth + (i > 0 ? GAP : 0);
        const last = i === cap - 1 && cap === pills.length;
        // Le dernier tag n'a pas besoin de laisser la place au « +N ».
        if (used + w + (last ? 0 : moreWidth) > width && !(last && used + w <= width)) break;
        used += w;
        fit = i + 1;
      }
      setVisible(fit);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags, max]);

  const hidden = tags.length - visible;

  return (
    <div ref={ref} className={cn("relative flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden", className)}>
      {tags.map((tag, i) => (
        <Badge
          key={tag}
          data-tag
          variant="primary"
          className={cn("shrink-0 whitespace-nowrap", i >= visible && "invisible absolute")}
        >
          {tag}
        </Badge>
      ))}
      <Tooltip label={tags.slice(visible).join(", ")}>
        <Badge
          data-more
          variant="muted"
          className={cn("shrink-0 whitespace-nowrap", hidden <= 0 && "invisible absolute")}
        >
          +{Math.max(hidden, 1)}
        </Badge>
      </Tooltip>
    </div>
  );
};

export default TagsOneLine;

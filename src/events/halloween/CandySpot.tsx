import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import CandyGrab from "./CandyGrab";
import { centerOf, reducedMotion } from "./grab";
import useCandies, { type CandyId } from "./useCandies";
import "./halloween.css";

/**
 * Bonbon caché à la place d'un élément du site (loupe, repère de carte…).
 * Un clic le prend sans déclencher l'élément qu'il remplace : il passe au
 * premier plan et grossit (CandyGrab), l'élément habituel (`fallback`)
 * reprend sa place.
 */
const CandySpot = ({
  candy,
  art,
  fallback,
  className,
}: {
  candy: CandyId;
  /** Le dessin du bonbon, qui remplit sa boîte. `clipId` : identifiant
   *  unique pour ses éventuels clipPath (l'original et sa copie coexistent). */
  art: (clipId: string) => ReactNode;
  /** L'élément habituel, une fois le bonbon pris. */
  fallback: ReactNode;
  /** Taille et position de la boîte du bonbon. */
  className?: string;
}) => {
  const { found, loading, find, on } = useCandies();
  const [grab, setGrab] = useState<{ m: DOMMatrix; w: number; h: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  // Hors chasse (après 2026) : l'élément habituel, tout simplement.
  if (!on && !grab) return <>{fallback}</>;

  // Tant qu'on ignore s'il est déjà pris : une place vide (ni bonbon ni
  // élément habituel qui changerait aussitôt).
  if (loading) return <span className={cn("block", className)} />;

  if (found.includes(candy))
    return (
      <>
        {fallback}
        {grab && (
          <CandyGrab m={grab.m} width={grab.w} onDone={() => setGrab(null)}>
            <span className="block" style={{ width: grab.w, height: grab.h }}>
              {art(`hl-${candy}-grab`)}
            </span>
          </CandyGrab>
        )}
      </>
    );

  const take = (e: MouseEvent) => {
    // L'élément remplacé ne réagit pas (recherche, ouverture…).
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (el && !reducedMotion()) {
      const r = el.getBoundingClientRect();
      setGrab({ m: centerOf(el), w: r.width, h: r.height });
    }
    find(candy);
  };

  return (
    <span ref={ref} className={cn("block cursor-pointer", className)} onClick={take}>
      {art(`hl-${candy}`)}
    </span>
  );
};

export default CandySpot;

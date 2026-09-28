import { Tooltip } from "@/components/ui/tooltip";
import {
  PriceFields,
  effectivePriceRange,
  formatPriceRange,
  priceRangeHint,
} from "../services/price";
import { cn } from "@/lib/utils";

interface PriceTagProps {
  restaurant: PriceFields;
  /** Pastille discrète (listes), pastille primaire, ou texte nu (fiche). */
  tone?: "muted" | "primary" | "plain";
  /** Infobulle « par personne, d'après N collègues ». Inutile là où la fiche
   *  donne déjà le contexte. */
  hint?: boolean;
  className?: string;
}

// La taille de texte est HÉRITÉE de la ligne qui accueille la pastille : dans
// les listes, le prix se lit alors exactement comme la note du restaurant
// posée à côté (même graisse, même opacité, même corps aux points de rupture).
// leading-none : le padding vertical devient symétrique, la pastille se centre
// donc exactement sur sa ligne.
const TONES = {
  muted:
    "rounded-full bg-muted px-2 py-1 font-semibold leading-none text-foreground/80",
  primary:
    "rounded-full bg-primary/10 px-2 py-1 font-semibold leading-none text-primary",
  plain: "font-medium",
};

/**
 * Fourchette de prix du midi d'un restaurant : « 14–18 € », ou rien tant
 * qu'aucun prix n'est renseigné. L'échelle locale est resserrée — 10 à 25 €
 * pour l'essentiel — donc on affiche les montants plutôt que des symboles €
 * qui ne distingueraient presque rien.
 */
const PriceTag = ({
  restaurant,
  tone = "muted",
  hint = true,
  className,
}: PriceTagProps) => {
  const price = effectivePriceRange(restaurant);
  if (!price) return null;

  const pill = (
    <span
      className={cn("inline-flex items-center tabular-nums", TONES[tone], className)}
    >
      {formatPriceRange(price)}
    </span>
  );

  // Pas de `keepOnClick` : dans une liste, un tap doit ouvrir le restaurant et
  // rien d'autre — sur tactile la bulle ne s'affiche donc pas (cf. Tooltip).
  return hint ? <Tooltip label={priceRangeHint(price)}>{pill}</Tooltip> : pill;
};

export default PriceTag;

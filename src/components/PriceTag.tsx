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

// Pastille CREUSE (contour, pas de fond) : les tags et le « +N » de
// TagsOneLine sont des pilules PLEINES — un prix rempli de gris se confondait
// avec eux. Même forme, traitement inverse : la différence se voit d'un coup
// d'œil sans ajouter de couleur.
// Le CORPS du texte est hérité de la ligne (text-xs puis sm:text-sm), la
// graisse et l'opacité reprennent celles de la note du restaurant.
// leading-none : le padding vertical devient symétrique, la pastille se centre
// donc exactement sur sa ligne.
const TONES = {
  muted:
    "rounded-full border border-border px-2 py-1 font-semibold leading-none text-foreground/80",
  primary:
    "rounded-full border border-primary/25 px-2 py-1 font-semibold leading-none text-primary",
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

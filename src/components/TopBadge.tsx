import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Rang au podium (1, 2 ou 3), ou 0 si le restaurant n'y est pas. La liste
 *  rendue par `useTopRated` est déjà classée : le rang, c'est l'index. */
export const topRankOf = (topRated: { id: number }[], id: number) =>
  topRated.findIndex((t) => t.id === id) + 1;

/** Or, argent, bronze. Un dégradé en diagonale (clair → vif → sombre) donne
 *  l'aspect métallisé de la médaille ; le texte reste sombre sur les trois,
 *  seul lisible sur ces fonds clairs. Seule la pastille se colore : l'anneau de
 *  la card garde la couleur primaire, quel que soit le rang. */
const MEDALS: Record<number, { className: string; tooltip: string }> = {
  1: {
    className:
      "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-amber-950",
    tooltip: "1er des mieux notés",
  },
  2: {
    className:
      "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-900",
    tooltip: "2e des mieux notés",
  },
  3: {
    className:
      "bg-gradient-to-br from-orange-200 via-[#cd7f32] to-[#8a5522] text-orange-950",
    tooltip: "3e des mieux notés",
  },
};

const SIZES = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1 text-xs",
} as const;

interface Props {
  /** 1, 2 ou 3. Toute autre valeur n'affiche rien. */
  rank: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Pastille de podium « Top 1 / 2 / 3 », commune à la card, la ligne et la fiche. */
const TopBadge = ({ rank, size = "md", className }: Props) => {
  const medal = MEDALS[rank];
  if (!medal) return null;

  return (
    <Tooltip label={medal.tooltip}>
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold shadow",
          medal.className,
          SIZES[size],
          className
        )}
      >
        Top {rank}
      </span>
    </Tooltip>
  );
};

export default TopBadge;

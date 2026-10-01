import { useState } from "react";
import { LuWallet } from "react-icons/lu";
import { FiX } from "react-icons/fi";
import { Restaurant } from "@/hooks/useRestaurants";
import { parisDay } from "@/hooks/useLunchToday";
import useMyPriceReport from "@/hooks/useMyPriceReport";
import OrbitDashes from "@/components/OrbitDashes";
import PriceQuickPicks from "@/components/PriceQuickPicks";
import PriceReportDialog from "@/components/PriceReportDialog";
import { quickPriceSuggestions } from "@/services/price";
import { toast } from "@/lib/toast";

interface Props {
  /** Le restaurant où j'ai déjeuné ce jour-là. */
  restaurant: Restaurant;
  /** Jour du déjeuner, "AAAA-MM-JJ" : il change la phrase, pas la mécanique. */
  day: string;
  /** « Ne me le redemande plus pour ce restaurant. » */
  onSkip: () => void;
}

/** "AAAA-MM-JJ" décalé de `days` jours (calcul en UTC, cf. useUnpricedLunches). */
const shiftDay = (day: string, days: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * « Hier », « Mardi », ou rien du tout pour aujourd'hui : une relance qui
 * resterait muette sur le jour ferait douter — « j'ai payé combien, et quand ? »
 */
const dayPrefix = (day: string): string => {
  const today = parisDay();
  if (day >= today) return "";
  if (day === shiftDay(today, -1)) return "Hier";
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * « Combien as-tu payé ? », posé à qui a déjeuné quelque part ces derniers
 * jours sans jamais donner le prix de l'endroit.
 *
 * C'est la seule accroche qui revient régulièrement : un avis se donne une
 * fois par restaurant et par personne, un déjeuner se déclare tous les midis.
 * La relance ne s'éteint pas à minuit — beaucoup reviennent sur le site le
 * lendemain, et le déjeuner de la veille se chiffre encore très bien
 * (demande du user, 2026-10-01 ; fenêtre dans useUnpricedLunches).
 *
 * Le bloc disparaît de lui-même dès que la déclaration est enregistrée.
 */
const LunchPricePrompt = ({ restaurant, day, onSkip }: Props) => {
  // Pas de garde « ai-je déjà déclaré ? » ici : useUnpricedLunches vient de le
  // vérifier en base, et attendre une seconde lecture retarderait le bloc d'un
  // aller-retour — le temps que son fondu d'ouverture soit déjà joué, sur un
  // bloc encore vide.
  const { save, saving } = useMyPriceReport(restaurant.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pick = async (value: number) => {
    try {
      // Un tap = un montant unique, donc les deux bornes égales : exactement ce
      // que veut dire « j'ai payé 15 € » (cf. PriceReportDialog).
      await save({ min: value, max: value });
      toast({
        title: "Merci !",
        description: "Ta déclaration affine la fourchette du restaurant.",
        status: "success",
        duration: 3000,
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : String(e),
        status: "error",
        duration: 5000,
      });
    }
  };

  const prefix = dayPrefix(day);

  return (
    <>
      {/* `border-transparent` : les points remplacent le pointillé mais ne
          prennent aucune place (tracé en position absolue). Sans cette bordure
          gardée, le bloc perdrait 2 px de hauteur. */}
      <div className="relative mb-3 sm:mb-6 flex flex-col gap-2.5 rounded-card border border-transparent bg-card px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-4">
        <OrbitDashes />
        {/* Une relance qui revient plusieurs jours a besoin d'une porte de
            sortie, sinon elle devient subie. */}
        <button
          type="button"
          onClick={onSkip}
          aria-label="Ne plus demander pour ce restaurant"
          className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-foreground/40 transition hover:bg-muted hover:text-foreground sm:right-3 sm:top-3"
        >
          <FiX className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-10 sm:w-10">
            <LuWallet className="h-5 w-5" />
          </span>
          <div className="min-w-0 text-sm text-foreground/70">
            {prefix ? `${prefix}, tu as déjeuné au ` : "Combien as-tu payé au "}
            <span className="font-semibold text-card-foreground">
              {restaurant.name}
            </span>
            {prefix ? ". Combien as-tu payé ?" : " ?"}
          </div>
        </div>

        {/* Les montants des collègues d'abord, la saisie libre juste à côté :
            c'est elle qui empêche les pastilles de figer la fourchette. */}
        <div className="flex flex-wrap items-center gap-2 sm:pl-[52px]">
          <PriceQuickPicks
            values={quickPriceSuggestions(restaurant)}
            disabled={saving}
            onPick={pick}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer text-sm font-medium text-primary underline-offset-2 transition hover:underline disabled:opacity-50"
          >
            Autre montant
          </button>
        </div>
      </div>

      <PriceReportDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        priceFields={restaurant}
      />
    </>
  );
};

export default LunchPricePrompt;

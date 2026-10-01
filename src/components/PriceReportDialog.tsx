import { useEffect, useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useMyPriceReport from "@/hooks/useMyPriceReport";
import PriceQuickPicks from "@/components/PriceQuickPicks";
import {
  PriceFields,
  formatAmount,
  quickPriceSuggestions,
} from "@/services/price";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: number;
  restaurantName: string;
  /** Colonnes de prix du resto : elles calent les montants proposés en un tap.
   *  Absentes = on propose les repères du marché local. */
  priceFields?: PriceFields;
}

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 200;
/** Appui long avant de retirer sa déclaration, comme la suppression d'un resto. */
const HOLD_MS = 1000;

/**
 * Saisie d'un montant en euros, virgule ou point : on ne garde que les
 * chiffres et le premier séparateur, 3 entiers et 2 décimales au plus, et on
 * affiche la virgule (« 12,50 »).
 */
const clean = (value: string) => {
  const [whole, ...rest] = value.replace(/[^\d.,]/g, "").split(/[.,]/);
  const cents = rest.join("");
  return rest.length === 0
    ? whole.slice(0, 3)
    : `${whole.slice(0, 3)},${cents.slice(0, 2)}`;
};

/** "12,50" → 12.5 ; "" → NaN (la saisie vide est traitée à part). */
const parse = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));

/** Champ montant : saisie décimale et « € » posé dans le champ, à droite. */
const EuroInput = ({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}) => (
  <div className="relative">
    <Input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(clean(e.target.value))}
      onKeyDown={(e) => {
        if (onEnter && e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      className="pr-8"
    />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
      €
    </span>
  </div>
);

/**
 * Déclaration de ce qu'on dépense dans un restaurant. Une seule par personne et
 * par resto : rouvrir le dialog corrige les valeurs, et on peut les retirer.
 *
 * La borne haute est FACULTATIVE et vaut la basse si on la laisse vide : qui
 * veut aller vite ne saisit qu'un chiffre. Ces déclarations alimentent la
 * fourchette de la fiche (médiane des bornes) ; personne d'autre ne voit les
 * montants d'une personne en particulier.
 */
export default function PriceReportDialog({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  priceFields,
}: Props) {
  const { report, save, remove, saving } = useMyPriceReport(restaurantId);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
  };

  // Nettoyage du timer si le dialog est démonté pendant un appui.
  useEffect(() => () => cancelHold(), []);

  useEffect(() => {
    if (!isOpen) return;
    setMin(report ? formatAmount(report.min) : "");
    // Une borne haute égale à la basse a été saisie « à un montant » : on
    // rouvre le dialog dans le même état, champ du haut seul.
    setMax(report && report.max !== report.min ? formatAmount(report.max) : "");
  }, [isOpen, report]);

  // Montants en un tap : les bornes déjà déclarées par les collègues quand
  // elles existent. Le tap remplit la borne basse et vide la haute — un seul
  // chiffre, ce que le dialog appelle « déclaration à un montant ».
  const quickValues = quickPriceSuggestions(
    priceFields ?? { price_low: null, price_high: null, price_count: 0 },
  );

  const minValue = parse(min);
  const maxValue = max.trim() === "" ? minValue : parse(max);
  const minFilled = !Number.isNaN(minValue);
  const inBounds = (v: number) => v >= MIN_AMOUNT && v <= MAX_AMOUNT;
  // Pastille allumée : une déclaration « à un montant » qui tombe pile sur
  // l'une des suggestions. Dès qu'une borne haute est saisie, plus de pastille.
  const quickSelected =
    max.trim() === "" && !Number.isNaN(minValue) ? minValue : null;
  const valid =
    minFilled &&
    !Number.isNaN(maxValue) &&
    inBounds(minValue) &&
    inBounds(maxValue) &&
    maxValue >= minValue;

  const handleSave = async () => {
    if (!valid) return;
    try {
      await save({ min: minValue, max: maxValue });
      toast({
        title: "Merci !",
        description: "Ta déclaration affine la fourchette du restaurant.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Réessaie.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const startHold = () => {
    if (saving || holdTimer.current) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      handleRemove();
    }, HOLD_MS);
  };

  const handleRemove = async () => {
    try {
      await remove();
      toast({
        title: "Déclaration retirée",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Réessaie.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Combien dépenses-tu ici ?</DialogTitle>

      <p className="mt-2 text-sm text-foreground/60">
        Pour un déjeuner chez {restaurantName}, pour toi seul(e). Personne ne
        voit tes montants : ils servent à calculer la fourchette du restaurant.
      </p>

      {/* Les pastilles AVANT les champs : sur mobile, c'est la sortie sans
          clavier. Le champ du dessous n'a donc pas d'autofocus — il ouvrait le
          pavé numérique par-dessus les montants qu'on vient proposer. */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">En un tap</span>
        <PriceQuickPicks
          values={quickValues}
          selected={quickSelected}
          disabled={saving}
          onPick={(value) => {
            setMin(formatAmount(value));
            setMax("");
          }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            D'habitude je paie
          </span>
          <EuroInput value={min} onChange={setMin} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Jusqu'à{" "}
            <span className="font-normal text-foreground/50">(facultatif)</span>
          </span>
          <EuroInput
            value={max}
            onChange={setMax}
            onEnter={() => handleSave()}
          />
        </label>
        {/* Seule erreur possible à la saisie : les bornes inversées. */}
        {minFilled && !Number.isNaN(maxValue) && maxValue < minValue && (
          <p className="text-xs font-medium text-destructive">
            Le montant maximum doit être supérieur au minimum.
          </p>
        )}
      </div>

      <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2">
        {report ? (
          <button
            type="button"
            disabled={saving}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Maintenir pour retirer ma déclaration"
            className="relative inline-flex h-10 cursor-pointer touch-none select-none items-center justify-center overflow-hidden rounded-lg bg-destructive px-3 text-sm font-medium text-white transition hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50 sm:px-4"
          >
            {/* Barre de progression de l'appui long */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-white/30 ease-linear"
              style={{
                width: holding ? "100%" : "0%",
                transitionProperty: "width",
                transitionDuration: holding ? `${HOLD_MS}ms` : "150ms",
              }}
            />
            <span className="relative inline-flex items-center gap-2">
              <FiTrash2 className="h-4 w-4" />
              Retirer
            </span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!valid}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

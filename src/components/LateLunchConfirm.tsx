import { ReactNode, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LUNCH_CUTOFF_HOUR, isAfterLunch } from "@/hooks/useLunchToday";

/** Ce qu'on s'apprête à faire d'un midi déjà déclaré. */
export type LateLunchChange =
  /** Remplacer son restaurant par un autre. */
  | "switch"
  /** Remplacer son restaurant par « pas de resto ». */
  | "off"
  /** Retirer sa déclaration du jour. */
  | "clear";

const WORDING: Record<
  LateLunchChange,
  { title: string; body: string; confirm: string; destructive: boolean }
> = {
  switch: {
    title: "Changer de restaurant ?",
    body: `Il est plus de ${LUNCH_CUTOFF_HOUR} h, le déjeuner est passé. Ton choix du jour sera remplacé — et c'est lui que tes collègues ont vu.`,
    confirm: "Changer",
    destructive: false,
  },
  off: {
    title: "Changer ton midi ?",
    body: `Il est plus de ${LUNCH_CUTOFF_HOUR} h, le déjeuner est passé. Déclarer « pas de restaurant » remplacera le restaurant où tu as déjeuné.`,
    confirm: "Changer",
    destructive: false,
  },
  clear: {
    // Le seul cas qui coûte vraiment quelque chose : la série « Flambé » compte
    // les jours OUVRÉS avec une déclaration, restaurant ou pas (cf.
    // sql/2026-09-20_public_profile_lunches.sql). Changer de resto la préserve,
    // tout retirer la coupe.
    title: "Retirer ton midi ?",
    body: `Il est plus de ${LUNCH_CUTOFF_HOUR} h, le déjeuner est passé. Retirer ta déclaration efface ta journée — et coupe ta série de midis déclarés.`,
    confirm: "Retirer",
    destructive: true,
  },
};

/**
 * Garde-fou des modifications tardives du midi : passé l'heure du déjeuner,
 * toucher à sa déclaration n'est presque jamais volontaire (poche, pouce qui
 * ripe sur « Rejoindre »), et le prix à payer est réel — la série de midis
 * déclarés se compte en jours ouvrés d'affilée.
 *
 * Avant l'heure, rien ne s'interpose : changer d'avis à 11 h est le fonctionnement
 * NORMAL de la page, pas un accident.
 *
 * Le hook rend lui-même sa modale, à poser une fois dans le composant appelant :
 *
 *     const { confirmLateChange, lateLunchDialog } = useLateLunchConfirm();
 *     …
 *     confirmLateChange("clear", hasPlan, () => leave());
 *     …
 *     {lateLunchDialog}
 */
export const useLateLunchConfirm = () => {
  const [pending, setPending] = useState<{
    kind: LateLunchChange;
    run: () => void;
  } | null>(null);

  /**
   * Exécute `run`, après confirmation si le midi est passé ET qu'il y a bien
   * quelque chose à écraser. `declared` = j'ai déjà déclaré aujourd'hui : une
   * PREMIÈRE déclaration à 15 h ne demande rien, elle ne détruit rien.
   */
  const confirmLateChange = (
    kind: LateLunchChange,
    declared: boolean,
    run: () => void
  ) => {
    if (!declared || !isAfterLunch()) {
      run();
      return;
    }
    setPending({ kind, run });
  };

  const close = () => setPending(null);

  const lateLunchDialog: ReactNode = pending ? (
    <Dialog open onClose={close} className="max-w-sm" showClose>
      {/* Marge à droite : la croix de fermeture. */}
      <DialogTitle>
        <span className="mr-8 block">{WORDING[pending.kind].title}</span>
      </DialogTitle>
      <p className="mb-0 mt-2 text-sm text-foreground/70">
        {WORDING[pending.kind].body}
      </p>
      <div className="mt-4 sm:mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          Annuler
        </Button>
        <Button
          variant={WORDING[pending.kind].destructive ? "destructive" : "primary"}
          onClick={() => {
            const { run } = pending;
            close();
            run();
          }}
        >
          {WORDING[pending.kind].confirm}
        </Button>
      </div>
    </Dialog>
  ) : null;

  return { confirmLateChange, lateLunchDialog };
};

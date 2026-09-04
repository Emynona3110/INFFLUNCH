import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import { FEEDBACK_TYPES, FeedbackType } from "@/services/feedbackTypes";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Demande à corriger ; absente = nouvelle demande. */
  item?: Feedback | null;
}

/**
 * Message tel qu'il sera stocké. On garde la mise en forme utile et on écrase
 * le reste : espaces et tabulations en série ramenés à un seul espace, rien qui
 * traîne en début ou en fin de ligne, et au plus une ligne vide d'affilée.
 * Séparer deux paragraphes est légitime ; empiler les blancs ne l'est pas — les
 * demandes se lisent en tuiles serrées.
 */
const clean = (text: string) =>
  text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * Saisie d'une demande sur l'appli : une nature, un message. Un seul formulaire
 * pour les trois natures — un bug et une idée ne méritent pas deux écrans, et on
 * ne veut surtout pas que le choix du bon endroit décourage l'envoi. Il sert
 * aussi à corriger une demande déjà envoyée, qui repart alors en attente.
 */
const FeedbackDialog = ({ isOpen, onClose, item }: Props) => {
  const { submit, edit } = useFeedback("mine", false);
  // Aucune nature présélectionnée : sans ce choix, tout arriverait en « Bug »
  // par inertie. La saisie n'est ouverte qu'une fois la nature dite.
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Formulaire vierge à chaque ouverture.
  useEffect(() => {
    if (!isOpen) return;
    setType(item?.type ?? null);
    setMessage(item?.message ?? "");
  }, [isOpen, item]);

  // Rien n'a bougé : inutile d'écrire en base (l'update ferait ressortir du
  // grisé une demande déjà traitée côté admin) ni d'annoncer une modification.
  const unchanged =
    !!item && type === item.type && clean(message) === item.message;

  const send = async () => {
    const text = clean(message);
    if (!type || !text) return;
    if (unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      if (item) await edit.mutateAsync({ id: item.id, type, message: text });
      else await submit.mutateAsync({ type, message: text });
      toast({
        title: item ? "Demande modifiée" : "Merci !",
        description: item
          ? undefined
          : "Ta demande est arrivée, tu peux la suivre dans Mon compte.",
        status: "success",
        duration: 4000,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: item ? "Modification impossible" : "Envoi impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>{item ? "Modifier la demande" : "Nouvelle demande"}</DialogTitle>

      <div className="mt-5 space-y-4">
        {/* Les trois pastilles se suffisent : un intitulé « Nature » au-dessus
            n'apprendrait rien de plus. */}
        <div>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setType(t.value);
                    // Enchaîner sur la saisie sans avoir à cliquer dedans.
                    messageRef.current?.focus();
                  }}
                  title={t.hint}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/70 hover:bg-muted"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", t.dot)} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col">
          <textarea
            ref={messageRef}
            rows={5}
            value={message}
            disabled={!type}
            // Le champ verrouillé dit lui-même ce qui manque.
            placeholder={type ? undefined : "Choisir une catégorie"}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-muted/40"
          />
        </label>
      </div>

      {/* Pas de suppression ici : elle vit dans la popup de lecture, d'où l'on
          arrive. */}
      <div className="mt-6 flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={send}
            loading={busy}
            disabled={!type || !clean(message) || unchanged}
          >
            {item ? "Enregistrer" : "Envoyer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default FeedbackDialog;

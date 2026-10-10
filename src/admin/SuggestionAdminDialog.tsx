import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import useRestaurantSuggestions, {
  RestaurantSuggestion,
  suggestionAwaitingAdmin,
} from "@/hooks/useRestaurantSuggestions";
import useUserNames from "@/hooks/useUserNames";
import RestaurantDialog from "./Dialogs/RestaurantDialog";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import SuggestionViewDialog from "@/components/SuggestionViewDialog";
import supabaseClient from "@/services/supabaseClient";
import { MAX_TEXT } from "@/services/textLimits";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Traitement admin d'une proposition de resto, ouvert depuis la table
 * Demandes :
 *   - en attente : dialog resto prérempli avec la proposition (l'auteur et son
 *     commentaire en tête). « Ajouter » crée la fiche — la proposition passe
 *     « Terminée » ; « Refuser » prend un motif facultatif lu par l'auteur. Les
 *     deux décisions se valident par appui long ;
 *   - tranchée, ou retirée par son auteur : popup de lecture, d'où l'on
 *     supprime la ligne — de la table admin seulement, l'auteur la garde.
 */
const SuggestionAdminDialog = ({
  target,
  onClose,
}: {
  target: RestaurantSuggestion | null;
  onClose: () => void;
}) => {
  const { nameOf } = useUserNames();
  const queryClient = useQueryClient();
  const { data: fetched = [], decide, remove } = useRestaurantSuggestions("admin");
  // Version courante (une correction de l'auteur arrivée en direct).
  const live = target ? (fetched.find((x) => x.id === target.id) ?? target) : null;
  // `target` (stable) décide du dialog : un changement d'état en cours de
  // route ne fait pas basculer de l'un à l'autre.
  // Retirée par son auteur alors qu'elle attendait : plus rien à trancher,
  // lecture et suppression seulement.
  const creating = target && suggestionAwaitingAdmin(target) ? target : null;
  const viewingLive = target && !suggestionAwaitingAdmin(target) ? live : null;

  // Préremplissage stable : le dialog se réinitialise à chaque nouvel objet.
  const prefill = useMemo(
    () =>
      creating
        ? {
            name: creating.name,
            address: creating.address,
            phone: creating.phone ?? undefined,
            website: creating.website ?? undefined,
            tags: creating.tags ?? [],
            lat: creating.lat,
            lng: creating.lng,
          }
        : undefined,
    [creating],
  );
  const [refusing, setRefusing] = useState(false);
  const [reply, setReply] = useState("");

  const run = async (
    action: Parameters<typeof decide.mutateAsync>[0],
    success: string,
  ) => {
    try {
      await decide.mutateAsync(action);
      toast({ title: success, status: "success", duration: 2500 });
      return true;
    } catch (e: any) {
      toast({
        title: "Action impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
      return false;
    }
  };

  const destroy = async (s: RestaurantSuggestion) => {
    try {
      await remove.mutateAsync(s.id);
      onClose();
      toast({ title: "Proposition supprimée", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({
        title: "Suppression impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  /** Fiche enregistrée : on retrouve son id par le slug pour la lier. */
  const onCreated = async (suggestion: RestaurantSuggestion, slug?: string) => {
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    const { data } = slug
      ? await supabaseClient.from("restaurants").select("id").eq("slug", slug).maybeSingle()
      : { data: null };
    await run(
      { id: suggestion.id, status: "accepte", restaurantId: data?.id ?? null },
      "Proposition acceptée",
    );
  };

  const refuse = async () => {
    if (!creating) return;
    const ok = await run(
      { id: creating.id, status: "refuse", reply },
      "Proposition refusée",
    );
    if (ok) {
      setRefusing(false);
      onClose();
    }
  };

  return (
    <>
      <RestaurantDialog
        isOpen={!!creating}
        onClose={onClose}
        initialData={prefill}
        onSuccess={(slug) => creating && onCreated(creating, slug)}
        holdToSubmit
        intro={
          creating && (
            <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
              <div className="text-xs text-foreground/55">
                Proposé par {nameOf(creating.email)} le {formatDate(creating.created_at)}
              </div>
              {creating.comment && (
                <p className="m-0 mt-1 whitespace-pre-wrap break-words text-foreground/85">
                  {creating.comment}
                </p>
              )}
            </div>
          )
        }
        footerStart={
          creating?.status === "nouveau" && (
            <Button
              variant="destructiveSoft"
              onClick={() => {
                setReply("");
                setRefusing(true);
              }}
            >
              Refuser
            </Button>
          )
        }
      />

      {/* Proposition tranchée : lecture (avec le lien vers la fiche si elle a
          été ajoutée) et suppression de la ligne, par appui long. */}
      <SuggestionViewDialog
        isOpen={!!viewingLive}
        onClose={onClose}
        item={viewingLive}
        author={viewingLive ? nameOf(viewingLive.email) : undefined}
        busy={remove.isPending}
        onDelete={() => viewingLive && destroy(viewingLive)}
      />

      <Dialog open={refusing} onClose={() => setRefusing(false)} className="max-w-md">
        <DialogTitle>Refuser « {creating?.name} »</DialogTitle>
        <textarea
          autoFocus
          value={reply}
          maxLength={MAX_TEXT}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Motif (facultatif, lu par l'auteur)"
          className="mt-4 h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRefusing(false)}>
            Annuler
          </Button>
          <HoldToDeleteButton
            onConfirm={refuse}
            title="Maintenir pour envoyer le refus"
            mobileConfirm={false}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-white shadow-sm hover:bg-destructive/90"
          >
            Envoyer
          </HoldToDeleteButton>
        </div>
      </Dialog>
    </>
  );
};

export default SuggestionAdminDialog;

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabaseClient from "@/services/supabaseClient";
import useSession from "@/hooks/useSession";
import { Review } from "@/hooks/useReviews";
import StarRatingInput from "./StarRatingInput";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/** Longueur max du commentaire d'avis. */
const MAX_COMMENT = 1000;

interface Props {
  restaurantId: number;
  /** Avis existant de l'utilisateur (édition) ou null/undefined (création). */
  existing?: Review | null;
  onDone: () => void;
}

/**
 * Dialog d'avis (création/édition), même DA que les dialogs admin restaurant.
 * Note obligatoire 1→5, commentaire optionnel. Upsert sur (restaurant_id,
 * user_id) → 1 avis par personne. Suppression par appui long. Après succès on
 * invalide les avis ET les restaurants (agrégats recalculés serveur par trigger).
 */
const ReviewForm = ({ restaurantId, existing, onDone }: Props) => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
  };

  const submit = async () => {
    if (rating < 1) {
      toast({
        title: "Note requise",
        description: "Choisis une note de 1 à 5 étoiles.",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    const { error } = await supabaseClient.from("reviews").upsert(
      {
        restaurant_id: restaurantId,
        user_id: userId,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: "restaurant_id,user_id" }
    );
    setSubmitting(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, status: "error", duration: 5000 });
      return;
    }

    refresh();
    toast({
      title: existing ? "Avis modifié" : "Avis publié",
      status: "success",
      duration: 2500,
    });
    onDone();
  };

  return (
    <Dialog open onClose={onDone} className="max-w-md">
      <DialogTitle>{existing ? "Modifier mon avis" : "Donner un avis"}</DialogTitle>

      <div className="mt-5 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Ta note</span>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
        placeholder="Ton avis (optionnel)…"
        rows={4}
        maxLength={MAX_COMMENT}
        className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      <div className="mt-1 text-right text-xs text-foreground/45">
        {comment.length}/{MAX_COMMENT}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button onClick={submit} loading={submitting}>
          {existing ? "Modifier" : "Publier"}
        </Button>
      </div>
    </Dialog>
  );
};

export default ReviewForm;

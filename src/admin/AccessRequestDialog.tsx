import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import { AccessRequest, RequestState } from "../hooks/useAccessRequests";
import { copyTempPassword } from "@/utils/tempPassword";
import { fnError } from "@/utils/fnError";
import RowActionsDialog from "./RowActionsDialog";
import useUserNames from "@/hooks/useUserNames";

/**
 * Actions sur une demande d'accès (inscription / mot de passe oublié), ouverte
 * depuis la table Demandes de l'admin : accepter ou refuser tant qu'elle
 * attend, la supprimer une fois traitée.
 */
const AccessRequestDialog = ({
  request: actionsFor,
  onClose,
}: {
  request: AccessRequest | null;
  onClose: () => void;
}) => {
  const { nameOf } = useUserNames();
  const queryClient = useQueryClient();
  // Inscription : le nom (tiré de l'email) en titre, mais l'email lui-même en
  // sous-titre — c'est l'adresse qu'on valide en acceptant.
  const isCreation = actionsFor?.type === "creation";

  const setState = (id: number, state: RequestState) =>
    supabaseClient.from("waiting_list").update({ state }).eq("id", id);

  const handleAccept = async (req: AccessRequest) => {
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email: req.email, type: req.type } }
    );

    if (error || data?.error) {
      const description = await fnError(error, data);
      toast({
        title: "Action impossible",
        description,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    await setState(req.id, "Accepted");
    // Le mot de passe temporaire ne vit que dans le presse-papier : l'admin
    // n'a plus qu'à coller le message dans Teams.
    void copyTempPassword(data.email, data.tempPassword);
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const handleReject = async (req: AccessRequest) => {
    const { error } = await setState(req.id, "Rejected");
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  // Suppression d'une demande obsolète (uniquement traitée : acceptée/refusée).
  const handleDelete = async (req: AccessRequest) => {
    const { error } = await supabaseClient
      .from("waiting_list")
      .delete()
      .eq("id", req.id);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  return (
    <>
      {/* Actions de la ligne cliquée : accepter/refuser tant que la demande
          attend, la supprimer une fois traitée. */}
      <RowActionsDialog
        open={!!actionsFor}
        onClose={onClose}
        title={actionsFor ? nameOf(actionsFor.email) : ""}
        subtitle={
          actionsFor
            ? `${isCreation ? `${actionsFor.email} · ` : ""}Demandé le ${new Date(actionsFor.created_at).toLocaleDateString("fr-FR")}`
            : undefined
        }
        actions={
          !actionsFor
            ? []
            : actionsFor.state === "Waiting"
              ? [
                  {
                    key: "accept",
                    label: "Accepter",
                    tone: "primary",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleAccept(actionsFor),
                  },
                  {
                    key: "reject",
                    label: "Refuser",
                    tone: "destructive",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleReject(actionsFor),
                  },
                ]
              : [
                  {
                    key: "delete",
                    label: "Supprimer la demande",
                    tone: "destructive",
                    hold: true,
                    holdTitle: "Maintenir pour supprimer la demande",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleDelete(actionsFor),
                  },
                ]
        }
      />
    </>
  );
};

export default AccessRequestDialog;

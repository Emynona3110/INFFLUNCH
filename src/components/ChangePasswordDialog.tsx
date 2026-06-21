import { useState } from "react";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useSession from "../hooks/useSession";
import PasswordField from "./PasswordField";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordDialog = ({ isOpen, onClose }: ChangePasswordDialogProps) => {
  const { sessionData } = useSession();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit =
    oldPassword !== "" && newPassword.length >= 6 && newPassword === confirm;

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const email = sessionData?.user?.email;
    if (!canSubmit || !email) return;

    setIsLoading(true);
    setError("");

    // 1) Vérifier l'ancien mot de passe en se ré-authentifiant
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (signInError) {
      setIsLoading(false);
      setError("Ancien mot de passe incorrect.");
      return;
    }

    // 2) Définir le nouveau mot de passe
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    setIsLoading(false);

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Réessaie.");
      return;
    }

    toast({
      title: "Mot de passe mis à jour",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>Changer le mot de passe</DialogTitle>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Username (email) caché → le gestionnaire associe le mdp au compte. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={sessionData?.user?.email ?? ""}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <PasswordField
          label="Ancien mot de passe"
          value={oldPassword}
          onChange={setOldPassword}
          autoComplete="current-password"
          name="current-password"
        />
        <PasswordField
          label="Nouveau mot de passe"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          name="new-password"
        />
        <PasswordField
          label="Confirmer le nouveau mot de passe"
          value={confirm}
          onChange={setConfirm}
          isInvalid={confirm !== "" && confirm !== newPassword}
          autoComplete="new-password"
          name="confirm-password"
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" loading={isLoading} disabled={!canSubmit}>
            Valider
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;

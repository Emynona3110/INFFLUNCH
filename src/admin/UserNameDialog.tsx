import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import supabaseClient from "@/services/supabaseClient";
import { USER_NAMES_KEY } from "@/hooks/useUserNames";
import type { AppUser } from "@/hooks/useUsers";
import { authorTrigram, formatAuthorName } from "@/utils/authorName";

interface Props {
  user: AppUser | null;
  onClose: () => void;
  /** Trigrammes des AUTRES comptes : signale un doublon avant d'enregistrer. */
  takenTrigrams: Set<string>;
}

/**
 * Nom affiché et trigramme d'un compte (admin). Calculés depuis l'email à la
 * création ; on les corrige ici (accents, prénom composé, trigrammes
 * identiques). Un champ vidé reprend la valeur calculée (trigger serveur).
 */
const UserNameDialog = ({ user, onClose, takenTrigrams }: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [trigram, setTrigram] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.display_name ?? "");
    setTrigram(user.trigram ?? "");
  }, [user]);

  const tri = trigram.trim().toUpperCase();
  const duplicate = !!tri && takenTrigrams.has(tri);

  const submit = async () => {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabaseClient
      .from("users")
      .update({ display_name: name.trim() || null, trigram: tri || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast({
        title: "Enregistrement impossible",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: [USER_NAMES_KEY] });
    toast({ title: "Nom mis à jour", status: "success", duration: 3000 });
    onClose();
  };

  return (
    <Dialog open={!!user} onClose={busy ? () => {} : onClose}>
      <DialogTitle>Nom et trigramme</DialogTitle>
      <p className="mt-1 text-sm text-foreground/60">{user?.email}</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block text-sm font-medium text-foreground/80">
          Nom affiché
          <Input
            autoFocus
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={formatAuthorName(user?.email)}
            maxLength={60}
            autoComplete="off"
            disabled={busy}
          />
        </label>
        <label className="block text-sm font-medium text-foreground/80">
          Trigramme
          <Input
            className="mt-1 uppercase"
            value={trigram}
            onChange={(e) => setTrigram(e.target.value)}
            placeholder={authorTrigram(user?.email)}
            maxLength={4}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
        </label>
        {duplicate && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Ce trigramme est déjà porté par un autre compte.
          </p>
        )}
        <p className="text-xs text-foreground/50">
          Un champ vide reprend la valeur calculée depuis l'email.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default UserNameDialog;

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import supabaseClient from "../../services/supabaseClient";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BadgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: { id: number; label: string };
}

const formatLabel = (value: string) =>
  value
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();

const BadgeDialog = ({ isOpen, onClose, onSuccess, initialData }: BadgeDialogProps) => {
  const [label, setLabel] = useState("");
  const [original, setOriginal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const formatted = initialData?.label ? formatLabel(initialData.label) : "";
    setLabel(formatted);
    setOriginal(formatted);
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    const formatted = formatLabel(label);
    if (!formatted) return;
    setIsSubmitting(true);

    if (initialData) {
      if (formatted === original) {
        toast({
          title: "Aucune modification",
          description: "Les données étaient identiques.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabaseClient
        .from("badges")
        .update({ label: formatted })
        .eq("id", initialData.id);

      if (updateError) {
        toast({
          title: "Erreur",
          description: updateError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      const { data: updated, error: fetchError } = await supabaseClient
        .from("badges")
        .select("label")
        .eq("id", initialData.id)
        .maybeSingle();

      setIsSubmitting(false);

      if (fetchError || !updated || formatLabel(updated.label) === original) {
        toast({
          title: "Aucune modification détectée",
          description: "L'enregistrement n'a pas changé dans la base.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      toast({ title: "Badge modifié", status: "success", duration: 3000, isClosable: true });
      onSuccess?.();
      onClose();
      return;
    }

    // Création : vérifier s'il existe déjà
    const { data: existing } = await supabaseClient
      .from("badges")
      .select("label")
      .eq("label", formatted);

    if (existing && existing.length > 0) {
      toast({
        title: "Badge existant",
        description: "Un badge avec ce nom existe déjà.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("badges")
      .insert({ label: formatted });
    setIsSubmitting(false);

    if (insertError) {
      toast({
        title: "Erreur d'ajout",
        description: insertError.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({ title: "Badge ajouté", status: "success", duration: 3000, isClosable: true });
    onSuccess?.();
    onClose();
  };

  const disabled =
    isSubmitting ||
    !label.trim() ||
    (!!initialData && formatLabel(label) === original);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{initialData ? "Modifier un badge" : "Ajouter un badge"}</DialogTitle>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Label</span>
          <Input
            autoFocus
            value={label}
            placeholder="ex : Local"
            onChange={(e) => setLabel(formatLabel(e.target.value))}
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={disabled}>
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default BadgeDialog;

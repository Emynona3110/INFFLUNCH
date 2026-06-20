import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import supabaseClient from "../../services/supabaseClient";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: { id: number; label: string };
}

const formatLabel = (input: string) =>
  input
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();

const TagDialog = ({ isOpen, onClose, onSuccess, initialData }: TagDialogProps) => {
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

    if (initialData) {
      if (formatted === original) {
        toast({
          title: "Aucune modification",
          description: "Les données étaient identiques.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      setIsSubmitting(true);
      const { error: updateError } = await supabaseClient
        .from("tags")
        .update({ label: formatted })
        .eq("id", initialData.id);

      if (updateError) {
        setIsSubmitting(false);
        toast({
          title: "Erreur",
          description: updateError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const { data: updated, error: fetchError } = await supabaseClient
        .from("tags")
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

      toast({ title: "Tag modifié", status: "success", duration: 3000, isClosable: true });
      onSuccess?.();
      onClose();
      return;
    }

    // Ajout d'un nouveau tag
    setIsSubmitting(true);
    const { error: insertError } = await supabaseClient
      .from("tags")
      .insert({ label: formatted });
    setIsSubmitting(false);

    if (insertError) {
      toast({
        title: "Erreur",
        description: insertError.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({ title: "Tag ajouté", status: "success", duration: 3000, isClosable: true });
    onSuccess?.();
    onClose();
  };

  const disabled =
    isSubmitting ||
    !label.trim() ||
    (!!initialData && formatLabel(label) === original);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{initialData ? "Modifier un tag" : "Ajouter un tag"}</DialogTitle>

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
            placeholder="ex : Végétarien"
            onChange={(e) => setLabel(formatLabel(e.target.value))}
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={disabled}>
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default TagDialog;

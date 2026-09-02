import { useEffect, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { toast } from "@/lib/toast";
import supabaseClient from "../../services/supabaseClient";
import {
  DEFAULT_TAG_CATEGORY,
  TAG_CATEGORIES,
  TagCategory,
  formatTagLabel,
} from "../../services/tagCategories";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: { id: number; label: string; category?: TagCategory };
}

const TagDialog = ({ isOpen, onClose, onSuccess, initialData }: TagDialogProps) => {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<TagCategory>(DEFAULT_TAG_CATEGORY);
  const [original, setOriginal] = useState("");
  const [originalCategory, setOriginalCategory] =
    useState<TagCategory>(DEFAULT_TAG_CATEGORY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const formatted = initialData?.label ? formatTagLabel(initialData.label).trim() : "";
    const initialCategory = initialData?.category ?? DEFAULT_TAG_CATEGORY;
    setLabel(formatted);
    setOriginal(formatted);
    setCategory(initialCategory);
    setOriginalCategory(initialCategory);
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    const formatted = formatTagLabel(label).trim();
    if (!formatted) return;

    if (initialData) {
      if (formatted === original && category === originalCategory) {
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
        .update({ label: formatted, category })
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
        .select("label, category")
        .eq("id", initialData.id)
        .maybeSingle();

      setIsSubmitting(false);

      const unchanged =
        !!updated &&
        formatTagLabel(updated.label).trim() === original &&
        updated.category === originalCategory;

      if (fetchError || !updated || unchanged) {
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
      .insert({ label: formatted, category });
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
    (!!initialData &&
      formatTagLabel(label).trim() === original &&
      category === originalCategory);

  const hint = TAG_CATEGORIES.find((c) => c.value === category)?.hint;

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
            onChange={(e) => setLabel(formatTagLabel(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Catégorie</span>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TagCategory)}
              className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              {TAG_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground opacity-50" />
          </div>
          {hint && <span className="text-xs text-foreground/55">{hint}</span>}
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

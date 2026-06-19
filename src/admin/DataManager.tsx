import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import AdminTable from "./AdminTable";
import { AdminSection } from "../services/adminSections";
import supabaseClient from "../services/supabaseClient";
import BadgeDialog from "./Dialogs/BadgeDialog";
import RestaurantDialog from "./Dialogs/RestaurantDialog";
import TagDialog from "./Dialogs/TagDialog";
import { Button } from "@/components/ui/button";

export interface DataManagerProps {
  section: AdminSection;
  /** Incrémenter cette valeur (depuis le parent) ouvre le dialog d'ajout. */
  addSignal?: number;
}

const DataManager = ({ section, addSignal }: DataManagerProps) => {
  const { tableName, columns } = section;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Ouverture du dialog d'ajout pilotée par le parent (bouton remonté dans la
  // barre d'onglets). On ignore la valeur initiale (0/undefined).
  useEffect(() => {
    if (addSignal) {
      setEditData(null);
      setIsDialogOpen(true);
    }
  }, [addSignal]);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditData(null);
    // Rafraîchit la table admin ainsi que les caches dérivés (tags, badges,
    // restaurants) utilisés ailleurs dans l'app.
    queryClient.invalidateQueries();
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    const { error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("id", deleteId);

    const { data: checkData } = await supabaseClient
      .from(tableName)
      .select("id")
      .eq("id", deleteId);

    if (deleteError || (checkData && checkData.length > 0)) {
      toast({
        title: "Erreur lors de la suppression",
        description:
          deleteError?.message || "L'entrée n'a pas pu être supprimée.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Suppression réussie",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      handleSuccess();
    }

    setDeleteId(null);
  };

  const renderDialog = () => {
    const commonProps = {
      isOpen: isDialogOpen,
      onClose: () => {
        setIsDialogOpen(false);
        setEditData(null);
      },
      onSuccess: handleSuccess,
      initialData: editData,
    };

    if (tableName === "tags") return <TagDialog {...commonProps} />;
    if (tableName === "badges") return <BadgeDialog {...commonProps} />;
    if (tableName === "restaurants") return <RestaurantDialog {...commonProps} />;
    return null;
  };

  return (
    <div className="tw-scope flex h-full flex-col p-4 pt-0">
      <div className="min-h-0 flex-1">
        <AdminTable
          tableName={tableName}
          columns={columns}
          onEdit={(data) => {
            setEditData(data);
            setIsDialogOpen(true);
          }}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      {/* Dialogs d'édition (encore Chakra — migration étape 2) */}
      {renderDialog()}

      {/* Confirmation de suppression */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="heading"
              aria-level={2}
              className="font-display text-lg font-bold text-card-foreground"
            >
              Confirmer la suppression
            </div>
            <p className="mt-3 text-sm text-foreground/80">
              Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est
              irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManager;

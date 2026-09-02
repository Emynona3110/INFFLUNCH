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
  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Nombre de restaurants portant le tag qu'on s'apprête à supprimer
  // (null = pas encore connu / table sans lien avec les restaurants).
  const [tagUsage, setTagUsage] = useState<number | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

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

  // Supprimer un tag le retire aussi des restaurants (trigger
  // `trigger_tags_sync_restaurants` en base) : on prévient avant.
  const askDelete = async (row: any) => {
    setDeleteRow(row);
    setTagUsage(null);
    if (tableName !== "tags" || !row?.label) return;

    setCheckingUsage(true);
    const { count, error } = await supabaseClient
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .contains("tags", [row.label]);
    setCheckingUsage(false);
    if (!error) setTagUsage(count ?? 0);
  };

  const closeDelete = () => {
    setDeleteRow(null);
    setTagUsage(null);
    setCheckingUsage(false);
  };

  const confirmDelete = async () => {
    const deleteId = deleteRow?.id;
    if (deleteId === undefined || deleteId === null) return;
    setDeleting(true);

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

    setDeleting(false);
    closeDelete();
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
    <div className="tw-scope flex h-full w-full flex-col px-4 pb-4">
      <AdminTable
        tableName={tableName}
        columns={columns}
        onEdit={(data) => {
          setEditData(data);
          setIsDialogOpen(true);
        }}
        onDelete={askDelete}
      />

      {/* Dialogs d'édition (encore Chakra — migration étape 2) */}
      {renderDialog()}

      {/* Confirmation de suppression */}
      {deleteRow !== null && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
          onClick={closeDelete}
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
              {checkingUsage
                ? "Vérification des restaurants concernés…"
                : tagUsage
                  ? `Le tag « ${deleteRow.label} » est utilisé par ${tagUsage} restaurant${
                      tagUsage > 1 ? "s" : ""
                    }. Le supprimer le retirera aussi de ${
                      tagUsage > 1 ? "ces fiches" : "cette fiche"
                    }. Cette action est irréversible.`
                  : "Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeDelete}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleting}
                disabled={checkingUsage}
              >
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

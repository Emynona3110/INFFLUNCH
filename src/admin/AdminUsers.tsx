import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useUsers, { AppUser } from "../hooks/useUsers";
import useSession from "../hooks/useSession";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import RowActionsDialog from "./RowActionsDialog";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { profilePath } from "@/utils/profilePath";
import { formatAuthorName } from "@/utils/authorName";
import { copyTempPassword } from "@/utils/tempPassword";
import { fnError } from "@/utils/fnError";

/** Date d'inscription, format court FR (identique à AdminFeedback). */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { data: users = [], isPending, error } = useUsers();
  const navigate = useNavigate();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;

  // Tri par colonne (3e clic = ordre de la requête, par email).
  const { sort, toggle } = useTableSort<"user" | "role" | "created">();
  const rows = sortRows(users, sort, (u, key) =>
    key === "user"
      ? formatAuthorName(u.email)
      : key === "role"
        ? u.role
        : Date.parse(u.created_at)
  );

  // Ligne dont la popup d'actions est ouverte (clic sur la ligne).
  const [actionsFor, setActionsFor] = useState<AppUser | null>(null);
  const [toDelete, setToDelete] = useState<AppUser | null>(null);
  // Par défaut on anonymise (avis, photos, menus restent, sans nom) ; effacer
  // aussi les contributions ne se fait que si la personne l'a demandé.
  const [erase, setErase] = useState(false);

  const handleReset = async (u: AppUser) => {
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email: u.email, type: "password_reset" } }
    );
    if (error || data?.error) {
      toast({
        title: "Réinitialisation impossible",
        description: await fnError(error, data),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    // Le mot de passe temporaire ne vit que dans le presse-papier : l'admin
    // n'a plus qu'à coller le message dans Teams.
    void copyTempPassword(data.email, data.tempPassword);
  };

  const handleDelete = async (u: AppUser) => {
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-delete-user",
      { body: { userId: u.id, mode: erase ? "erase" : "anonymize" } }
    );
    if (error || data?.error) {
      toast({
        title: "Suppression impossible",
        description: await fnError(error, data),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["users"] });
    setErase(false);
    toast({
      title: erase
        ? "Compte et contributions supprimés"
        : "Compte supprimé, contributions anonymisées",
      status: "success",
      duration: 3000,
    });
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col sm:px-4 sm:pb-4">
      {isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : users.length === 0 ? (
        <p className="text-foreground/60">Aucun utilisateur.</p>
      ) : (
        <div className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="min-h-0 os-grid"
            // La barre verticale démarre sous l'entête figée ; l'horizontale
            // va jusqu'au bord, faute de colonne Actions à contourner.
            style={{ ["--grid-right" as string]: "0px" }}
          >
            <table
              className="w-full border-separate border-spacing-0 text-center text-sm"
              // Les colonnes s'étalent sur la largeur disponible et se
              // rapprochent quand l'écran rétrécit (répartition naturelle de
              // `w-full`). Ce plancher n'est qu'un filet : en dessous, la
              // ScrollArea reprend la main plutôt que d'écraser les colonnes.
              style={{ minWidth: 400 }}
            >
              <thead>
                <tr>
                  {(
                    [
                      { key: "user", label: "Utilisateur" },
                      { key: "role", label: "Rôle" },
                      { key: "created", label: "Inscrit le" },
                    ] as const
                  ).map((c) => (
                    <th
                      key={c.key}
                      className="sticky top-0 z-10 bg-muted px-2 py-3 first:pl-4 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]"
                    >
                      <SortHeader
                        label={c.label}
                        dir={sort?.key === c.key ? sort.dir : null}
                        onClick={() => toggle(c.key)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isAdmin = u.role === "admin";
                  return (
                    <tr
                      key={u.id}
                      // Clic sur la ligne = ce qu'on peut faire de ce compte
                      // (le profil en fait partie), comme la fiche d'une demande.
                      onClick={() => setActionsFor(u)}
                      aria-label="Actions sur ce compte"
                      className="cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60"
                    >
                      <td className="px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/90">
                        {formatAuthorName(u.email)}
                      </td>
                      <td className="px-2 py-1.5 first:pl-4 last:pr-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            isAdmin
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-foreground/60"
                          )}
                        >
                          {isAdmin ? "Admin" : "Membre"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Actions de la ligne cliquée. Celles qui ouvrent une autre popup la
          referment d'abord : jamais deux fenêtres empilées. */}
      <RowActionsDialog
        open={!!actionsFor}
        onClose={() => setActionsFor(null)}
        title={actionsFor ? formatAuthorName(actionsFor.email) : ""}
        subtitle={actionsFor?.email}
        actions={
          actionsFor
            ? [
                {
                  key: "profile",
                  label: "Voir le profil",
                  // Navigation : rien à attendre, la popup se ferme aussitôt.
                  onSelect: () =>
                    navigate(profilePath(actionsFor.id, actionsFor.email)),
                },
                {
                  key: "reset",
                  label: "Réinitialiser le mot de passe",
                  tone: "primary",
                  hold: true,
                  holdTitle: "Maintenir pour réinitialiser le mot de passe",
                  disabled: actionsFor.id === myId,
                  disabledReason: "Change ton mot de passe depuis Mon compte.",
                  // Appel serveur : le bouton tourne jusqu'à la réponse.
                  onSelect: () => handleReset(actionsFor),
                },
                {
                  key: "delete",
                  label: "Supprimer le compte",
                  tone: "destructive",
                  hold: true,
                  holdTitle: "Maintenir pour supprimer le compte",
                  disabled: actionsFor.id === myId,
                  disabledReason: "Vous ne pouvez pas vous supprimer.",
                  // Ouvre la confirmation : celle-ci la remplace dans le
                  // même rendu.
                  onSelect: () => setToDelete(actionsFor),
                },
              ]
            : []
        }
      />

      <ConfirmDeleteDialog
        open={!!toDelete}
        onClose={() => {
          setToDelete(null);
          setErase(false);
        }}
        onConfirm={() => (toDelete ? handleDelete(toDelete) : undefined)}
        title="Supprimer l'utilisateur"
        description={
          <>
            Le compte <strong>{toDelete?.email}</strong> et ses données
            personnelles (profil, favoris, demandes…) seront définitivement
            supprimés. Ses avis, photos et menus resteront, anonymisés
            (« Ancien collaborateur »).
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={erase}
                onChange={(e) => setErase(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-destructive"
              />
              <span>
                Effacer aussi ses contributions (à sa demande expresse
                uniquement)
              </span>
            </label>
          </>
        }
      />
    </div>
  );
};

export default AdminUsers;

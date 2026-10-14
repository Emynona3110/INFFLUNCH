import { useMemo, useState } from "react";
import { FiShield, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useUsers, { AppUser } from "../hooks/useUsers";
import useSession from "../hooks/useSession";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import RowActionsDialog from "./RowActionsDialog";
import UserNameDialog from "./UserNameDialog";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { profilePath } from "@/utils/profilePath";
import { authorTrigram, formatAuthorName } from "@/utils/authorName";
import { copyTempPassword } from "@/utils/tempPassword";
import { fnError } from "@/utils/fnError";
import AdminTableSkeleton from "@/admin/AdminTableSkeleton";
import StateChip from "./StateChip";

/** Rôle : libellé à partir de sm, icône sur mobile (bouclier, comme l'entrée
 *  Admin du menu du compte). */
const ROLES = {
  admin: { label: "Admin", Icon: FiShield, chip: "bg-primary/10 text-primary" },
  member: { label: "Membre", Icon: FiUser, chip: "bg-muted text-foreground/60", iconClass: "text-foreground opacity-60" },
} as const;

/** Valeurs stockées, avec repli sur le calcul depuis l'email. */
const nameOf = (u: AppUser) => u.display_name || formatAuthorName(u.email);
const trigramOf = (u: AppUser) => u.trigram || authorTrigram(u.email);

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

  // Tri par colonne ; par défaut, par nom.
  const { sort, toggle, firstDir } = useTableSort<"user" | "trigram" | "role" | "created">("users", {
    key: "user",
    dir: "asc",
  });
  const rows = sortRows(users, sort, (u, key) =>
    key === "user"
      ? nameOf(u)
      : key === "trigram"
        ? trigramOf(u)
        : key === "role"
          ? u.role
          : Date.parse(u.created_at)
  );

  // Trigrammes portés par plusieurs comptes : signalés dans la table, à
  // départager depuis la popup « Nom et trigramme ».
  const trigramCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) m.set(trigramOf(u), (m.get(trigramOf(u)) ?? 0) + 1);
    return m;
  }, [users]);
  /** Trigramme (surligné s'il est en double), entre parenthèses sur mobile
   *  où il suit le nom. */
  const trigram = (u: AppUser, paren = false) => {
    const t = paren ? `(${trigramOf(u)})` : trigramOf(u);
    return (trigramCount.get(trigramOf(u)) ?? 0) > 1 ? (
      <span
        className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
        aria-label={`${trigramOf(u)} (trigramme en double)`}
      >
        {t}
      </span>
    ) : (
      <span className="text-foreground/70">{t}</span>
    );
  };
  const [editing, setEditing] = useState<AppUser | null>(null);
  const takenTrigrams = useMemo(
    () => new Set(users.filter((u) => u.id !== editing?.id).map(trigramOf)),
    [users, editing]
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
        <AdminTableSkeleton />
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
              className="admin-table w-full border-separate border-spacing-0 text-center text-sm"
              // Les colonnes s'étalent sur la largeur disponible et se
              // rapprochent quand l'écran rétrécit (répartition naturelle de
              // `w-full`). Ce plancher n'est qu'un filet : en dessous, la
              // ScrollArea reprend la main plutôt que d'écraser les colonnes.
              // Il ne vaut qu'à partir de 768 px : sur mobile il dépassait la
              // carte et imposait le défilement à lui seul (cf. `.admin-table`).
              style={{ ["--admin-min-w" as string]: "400px" }}
            >
              <thead>
                <tr>
                  {(
                    [
                      { key: "user", label: "Utilisateur" },
                      { key: "trigram", label: "Trigramme" },
                      { key: "created", label: "Inscrit le" },
                      { key: "role", label: "Rôle" },
                    ] as const
                  ).map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "sticky top-0 z-10 bg-muted px-2 py-3 first:pl-4 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        // Mobile : pas de colonne trigramme, il suit le nom.
                        c.key === "trigram" && "hidden sm:table-cell",
                      )}
                    >
                      <SortHeader
                        label={c.label}
                        dir={sort.key === c.key ? sort.dir : null}
                        idleDir={firstDir(c.key)}
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
                        {nameOf(u)}
                        {/* Mobile : trigramme entre parenthèses après le nom. */}
                        <span className="whitespace-nowrap sm:hidden">
                          {" "}
                          {trigram(u, true)}
                        </span>
                      </td>
                      <td className="hidden px-2 py-1.5 first:pl-4 last:pr-4 sm:table-cell">
                        {trigram(u)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-2 py-1.5 first:pl-4 last:pr-4">
                        <StateChip state={isAdmin ? ROLES.admin : ROLES.member} />
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
        title={actionsFor ? nameOf(actionsFor) : ""}
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
                  key: "name",
                  label: "Modifier le nom et le trigramme",
                  onSelect: () => setEditing(actionsFor),
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

      <UserNameDialog
        user={editing}
        onClose={() => setEditing(null)}
        takenTrigrams={takenTrigrams}
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

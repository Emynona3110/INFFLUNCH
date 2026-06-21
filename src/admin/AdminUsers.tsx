import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiCopy, FiKey, FiTrash2 } from "react-icons/fi";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useUsers, { AppUser } from "../hooks/useUsers";
import useSession from "../hooks/useSession";
import HoldToDeleteButton from "../components/HoldToDeleteButton";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Extrait un message d'erreur lisible d'un retour d'Edge Function. */
const fnError = async (error: any, data: any): Promise<string> => {
  if (data?.error) return data.error;
  if (error?.context) {
    try {
      return (await error.context.json())?.error ?? error.message;
    } catch {
      /* ignore */
    }
  }
  return error?.message ?? "Une erreur est survenue.";
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { data: users = [], isPending, error } = useUsers();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;

  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié", status: "success", duration: 1500 });
  };

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
    setCredentials({ email: data.email, tempPassword: data.tempPassword });
  };

  const handleDelete = async (u: AppUser) => {
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-delete-user",
      { body: { userId: u.id } }
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
    toast({ title: "Utilisateur supprimé", status: "success", duration: 2500 });
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col px-4 pb-4">
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
            style={{ ["--grid-right" as string]: "117px" }}
          >
            <table
              className="w-full border-separate border-spacing-0 text-sm"
              style={{ minWidth: 600 }}
            >
              <thead>
                <tr>
                  {["Email", "Rôle", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "sticky top-0 bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        h === "Actions"
                          ? "right-0 z-20 w-px whitespace-nowrap text-center shadow-[inset_1px_0_0_0_var(--border),inset_0_-1px_0_0_var(--border)]"
                          : "z-10 text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === myId;
                  const isAdmin = u.role === "admin";
                  return (
                    <tr
                      key={u.id}
                      className="transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60"
                    >
                      <td className="px-4 py-3 text-foreground/90">
                        {u.email}
                        {isMe && (
                          <span className="ml-2 text-xs text-foreground/45">(moi)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="sticky right-0 z-[1] w-px whitespace-nowrap bg-card px-4 py-3 text-center shadow-[inset_1px_0_0_0_var(--border)]">
                        <div className="flex justify-center gap-2">
                          <Tooltip
                            label={
                              isMe
                                ? "Change ton mot de passe depuis Mon compte"
                                : "Maintenir pour réinitialiser le mot de passe"
                            }
                          >
                            <HoldToDeleteButton
                              onConfirm={() => handleReset(u)}
                              disabled={isMe}
                              title="Maintenir pour réinitialiser le mot de passe"
                              className="grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-primary/10"
                              progressClassName="bg-primary/20"
                            >
                              <FiKey className="h-4 w-4" />
                            </HoldToDeleteButton>
                          </Tooltip>
                          <Tooltip
                            label={
                              isMe
                                ? "Vous ne pouvez pas vous supprimer"
                                : "Maintenir pour supprimer"
                            }
                          >
                            <HoldToDeleteButton
                              onConfirm={() => handleDelete(u)}
                              disabled={isMe}
                              title="Maintenir pour supprimer l'utilisateur"
                              className="grid h-9 w-9 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                              progressClassName="bg-destructive/20"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </HoldToDeleteButton>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Mot de passe temporaire après réinitialisation */}
      {credentials && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCredentials(null)}
        >
          <div
            className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="heading"
              aria-level={2}
              className="font-display text-xl font-bold text-card-foreground"
            >
              Mot de passe réinitialisé ✅
            </div>
            <p className="mt-3 text-sm text-foreground/80">
              Transmets ce mot de passe à <b>{credentials.email}</b> via Teams.
              Il devra le changer à la prochaine connexion.
            </p>
            <div className="mt-4">
              <span className="text-xs text-foreground/50">
                Mot de passe temporaire
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 text-base text-foreground">
                  {credentials.tempPassword}
                </code>
                <button
                  type="button"
                  onClick={() => copy(credentials.tempPassword)}
                  aria-label="Copier"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border text-foreground/70 transition hover:bg-muted"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setCredentials(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useAccessRequests, {
  AccessRequest,
  RequestState,
  RequestType,
} from "../hooks/useAccessRequests";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { copyTempPassword } from "@/utils/tempPassword";
import { fnError } from "@/utils/fnError";
import RowActionsDialog from "./RowActionsDialog";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";
import { formatAuthorName } from "@/utils/authorName";

// Table d'une catégorie de demandes. Les onglets (Inscription / Mot de passe)
// sont gérés par la section Admin parente, qui passe le type actif.
const AccessRequests = ({ activeType }: { activeType: RequestType }) => {
  const queryClient = useQueryClient();

  const [processingId, setProcessingId] = useState<number | null>(null);

  // Ligne dont la popup d'actions est ouverte (clic sur la ligne).
  const [actionsFor, setActionsFor] = useState<AccessRequest | null>(null);

  const { data: requests = [], isPending, error } = useAccessRequests();

  // Inscriptions : le compte n'existe pas encore, l'email EST l'identité (et
  // c'est lui qu'on valide). Ailleurs, on montre le nom d'utilisateur.
  const isCreation = activeType === "creation";

  // Demandes du type actif, en attente d'abord.
  const sorted = requests
    .filter((r) => r.type === activeType)
    .sort((a, b) => {
      if (a.state === "Waiting" && b.state !== "Waiting") return -1;
      if (a.state !== "Waiting" && b.state === "Waiting") return 1;
      return 0;
    });

  // Tri par colonne (3e clic = ordre naturel : en attente d'abord).
  const { sort, toggle } = useTableSort<"who" | "date" | "state">();
  const rows = sortRows(sorted, sort, (r, key) =>
    key === "who"
      ? isCreation
        ? r.email
        : formatAuthorName(r.email)
      : key === "date"
        ? Date.parse(r.created_at)
        : // En attente d'abord, puis acceptée, puis refusée.
          ["Waiting", "Accepted", "Rejected"].indexOf(r.state)
  );

  const setState = (id: number, state: RequestState) =>
    supabaseClient.from("waiting_list").update({ state }).eq("id", id);

  const handleAccept = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email: req.email, type: req.type } }
    );

    if (error || data?.error) {
      const description = await fnError(error, data);
      setProcessingId(null);
      toast({
        title: "Action impossible",
        description,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    await setState(req.id, "Accepted");
    setProcessingId(null);
    // Le mot de passe temporaire ne vit que dans le presse-papier : l'admin
    // n'a plus qu'à coller le message dans Teams.
    void copyTempPassword(data.email, data.tempPassword);
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const handleReject = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { error } = await setState(req.id, "Rejected");
    setProcessingId(null);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  // Suppression d'une demande obsolète (uniquement traitée : acceptée/refusée).
  const handleDelete = async (req: AccessRequest) => {
    const { error } = await supabaseClient
      .from("waiting_list")
      .delete()
      .eq("id", req.id);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col sm:px-4 sm:pb-4">
      {isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : sorted.length === 0 ? (
        <p className="text-foreground/60">Aucune demande.</p>
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
              // Cf. AdminUsers : plancher, pas une largeur cible, et seulement
              // à partir de 640 px (cf. `.admin-table`). Un peu plus haut ici,
              // la colonne Inscriptions montrant l'email entier.
              style={{ ["--admin-min-w" as string]: "420px" }}
            >
              <thead>
                <tr>
                  {(
                    [
                      {
                        key: "who",
                        label: isCreation ? "Email" : "Utilisateur",
                      },
                      { key: "date", label: "Date" },
                      { key: "state", label: "Statut" },
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
              {rows.map((req) => {
                const pending = req.state === "Waiting";
                return (
                  <tr
                    key={req.id}
                    // Clic sur la ligne = ce qu'on peut faire de cette demande,
                    // comme la fiche d'une demande de collaborateur.
                    onClick={() => setActionsFor(req)}
                    aria-label="Actions sur cette demande"
                    className="cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60"
                  >
                    <td className="px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/90">
                      {isCreation ? req.email : formatAuthorName(req.email)}
                    </td>
                    <td className="px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-2 py-1.5 first:pl-4 last:pr-4">
                      {/* Les boutons portaient le spinner ; ils sont passés en
                          popup, c'est donc le statut qui montre l'attente. */}
                      {processingId === req.id ? (
                        <Spinner />
                      ) : pending ? (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                          En attente
                        </span>
                      ) : req.state === "Accepted" ? (
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                          Acceptée
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          Refusée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Actions de la ligne cliquée : accepter/refuser tant que la demande
          attend, la supprimer une fois traitée. */}
      <RowActionsDialog
        open={!!actionsFor}
        onClose={() => setActionsFor(null)}
        title={
          actionsFor
            ? isCreation
              ? actionsFor.email
              : formatAuthorName(actionsFor.email)
            : ""
        }
        subtitle={
          actionsFor
            ? `Demandé le ${new Date(actionsFor.created_at).toLocaleDateString("fr-FR")}`
            : undefined
        }
        actions={
          !actionsFor
            ? []
            : actionsFor.state === "Waiting"
              ? [
                  {
                    key: "accept",
                    label: "Accepter",
                    tone: "primary",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleAccept(actionsFor),
                  },
                  {
                    key: "reject",
                    label: "Refuser",
                    tone: "destructive",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleReject(actionsFor),
                  },
                ]
              : [
                  {
                    key: "delete",
                    label: "Supprimer la demande",
                    tone: "destructive",
                    hold: true,
                    holdTitle: "Maintenir pour supprimer la demande",
                    // Appel serveur : le bouton tourne jusqu'à la réponse.
                    onSelect: () => handleDelete(actionsFor),
                  },
                ]
        }
      />
    </div>
  );
};

export default AccessRequests;

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import useRestaurantSuggestions, {
  RestaurantSuggestion,
  SUGGESTION_STATUSES,
} from "@/hooks/useRestaurantSuggestions";
import useUserNames from "@/hooks/useUserNames";
import RestaurantDialog from "./Dialogs/RestaurantDialog";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import supabaseClient from "@/services/supabaseClient";
import { MAX_TEXT } from "@/services/textLimits";
import { cn } from "@/lib/utils";
import SuggestionViewDialog from "@/components/SuggestionViewDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Propositions de restos des collaborateurs, en table comme les demandes :
 * restaurant, date, auteur, état.
 *   - En attente : un clic ouvre le dialog resto prérempli avec la proposition
 *     (l'auteur et son commentaire en tête). L'admin complète, corrige, puis
 *     « Ajouter » crée la fiche — la proposition passe « Ajouté ». « Refuser »
 *     prend un motif facultatif lu par l'auteur. Les deux décisions se valident
 *     par appui long.
 *   - Tranchée (ajoutée ou refusée) : un clic ouvre une popup de lecture, comme
 *     pour les demandes, d'où l'on supprime la ligne.
 */
const AdminSuggestions = () => {
  const { nameOf } = useUserNames();
  const queryClient = useQueryClient();
  const { data: fetched = [], isPending, error, decide, remove } =
    useRestaurantSuggestions("admin");
  // Date de la dernière version : une correction de l'auteur fait remonter la
  // proposition, comme dans la boîte de réception des demandes.
  const lastVersion = (s: RestaurantSuggestion) => s.updated_at ?? s.created_at;

  // Tri par colonne ; par défaut, la plus récente d'abord.
  const { sort, toggle, firstDir } = useTableSort<"name" | "date" | "author" | "state">(
    "suggestions",
    { key: "date", dir: "desc" },
  );
  const rows = sortRows(fetched, sort, (s, key) =>
    key === "name"
      ? s.name
      : key === "date"
        ? Date.parse(lastVersion(s))
        : key === "author"
          ? nameOf(s.email)
          : SUGGESTION_STATUSES[s.status].label,
  );

  const [creating, setCreating] = useState<RestaurantSuggestion | null>(null);
  // Préremplissage stable : le dialog se réinitialise à chaque nouvel objet.
  const prefill = useMemo(
    () =>
      creating
        ? {
            name: creating.name,
            address: creating.address,
            phone: creating.phone ?? undefined,
            website: creating.website ?? undefined,
            tags: creating.tags ?? [],
            lat: creating.lat,
            lng: creating.lng,
          }
        : undefined,
    [creating],
  );
  const [refusing, setRefusing] = useState(false);
  const [reply, setReply] = useState("");

  const run = async (
    action: Parameters<typeof decide.mutateAsync>[0],
    success: string,
  ) => {
    try {
      await decide.mutateAsync(action);
      toast({ title: success, status: "success", duration: 2500 });
      return true;
    } catch (e: any) {
      toast({
        title: "Action impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
      return false;
    }
  };

  // Tranchée (ajoutée ou refusée) : popup de lecture, pour la supprimer.
  const [viewing, setViewing] = useState<RestaurantSuggestion | null>(null);
  const viewingLive = viewing
    ? (fetched.find((x) => x.id === viewing.id) ?? viewing)
    : null;

  const open = (s: RestaurantSuggestion) => {
    if (s.status === "nouveau") setCreating(s);
    else setViewing(s);
  };

  const destroy = async (s: RestaurantSuggestion) => {
    try {
      await remove.mutateAsync(s.id);
      setViewing(null);
      toast({ title: "Proposition supprimée", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({
        title: "Suppression impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

  /** Fiche enregistrée : on retrouve son id par le slug pour la lier. */
  const onCreated = async (suggestion: RestaurantSuggestion, slug?: string) => {
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    const { data } = slug
      ? await supabaseClient.from("restaurants").select("id").eq("slug", slug).maybeSingle()
      : { data: null };
    await run(
      { id: suggestion.id, status: "accepte", restaurantId: data?.id ?? null },
      "Proposition acceptée",
    );
  };

  const refuse = async () => {
    if (!creating) return;
    const ok = await run(
      { id: creating.id, status: "refuse", reply },
      "Proposition refusée",
    );
    if (ok) {
      setRefusing(false);
      setCreating(null);
    }
  };

  if (isPending) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  if (error) return <p className="text-destructive">Erreur : {error.message}</p>;

  return (
    <div className="tw-scope flex h-full w-full flex-col sm:px-4 sm:pb-4">
      {rows.length === 0 ? (
        <p className="m-0 py-10 text-center text-foreground/60">Aucune proposition pour le moment.</p>
      ) : (
        <div className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="min-h-0 os-grid"
            // Pas de colonne Actions : l'horizontale va au bord.
            style={{ ["--grid-right" as string]: "0px" }}
          >
            <table
              className="admin-table w-full border-separate border-spacing-0 text-center text-sm"
              style={{ ["--admin-min-w" as string]: "380px" }}
            >
              <thead>
                <tr>
                  {(
                    [
                      { key: "name", label: "Restaurant" },
                      { key: "date", label: "Date" },
                      { key: "author", label: "Auteur" },
                      { key: "state", label: "État" },
                    ] as const
                  ).map((c) => (
                    <th
                      key={c.key}
                      className="sticky top-0 z-10 bg-muted px-2 py-3 first:pl-4 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]"
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
                {rows.map((s) => {
                  const status = SUGGESTION_STATUSES[s.status];
                  return (
                    // Toute la ligne ouvre le dialog resto prérempli (ou la
                    // fiche, une fois ajoutée).
                    <tr
                      key={s.id}
                      onClick={() => open(s)}
                      aria-label={s.status === "nouveau" ? "Créer la fiche" : "Voir la proposition"}
                      className={cn(
                        "cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60",
                        // Ce qui attend l'admin se lit en pleine couleur ; le
                        // reste, déjà tranché, reste en retrait.
                        s.status === "nouveau" && "[&>td]:text-foreground",
                      )}
                    >
                      <td className="max-w-[14rem] truncate px-2 py-1.5 first:pl-4 last:pr-4 font-medium text-foreground/70">
                        {s.name}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {formatDate(lastVersion(s))}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {s.email ? nameOf(s.email) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            status.chip,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      <RestaurantDialog
        isOpen={!!creating}
        onClose={() => setCreating(null)}
        initialData={prefill}
        onSuccess={(slug) => creating && onCreated(creating, slug)}
        holdToSubmit
        intro={
          creating && (
            <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
              <div className="text-xs text-foreground/55">
                Proposé par {nameOf(creating.email)} le {formatDate(creating.created_at)}
              </div>
              {creating.comment && (
                <p className="m-0 mt-1 whitespace-pre-wrap break-words text-foreground/85">
                  {creating.comment}
                </p>
              )}
            </div>
          )
        }
        footerStart={
          creating?.status === "nouveau" && (
            <Button
              variant="destructiveSoft"
              onClick={() => {
                setReply("");
                setRefusing(true);
              }}
            >
              Refuser
            </Button>
          )
        }
      />

      {/* Proposition tranchée : lecture (avec le lien vers la fiche si elle a
          été ajoutée) et suppression de la ligne, par appui long. */}
      <SuggestionViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewingLive}
        author={viewingLive ? nameOf(viewingLive.email) : undefined}
        busy={remove.isPending}
        onDelete={() => viewingLive && destroy(viewingLive)}
      />

      <Dialog open={refusing} onClose={() => setRefusing(false)} className="max-w-md">
        <DialogTitle>Refuser « {creating?.name} »</DialogTitle>
        <textarea
          autoFocus
          value={reply}
          maxLength={MAX_TEXT}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Motif (facultatif, lu par l'auteur)"
          className="mt-4 h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRefusing(false)}>
            Annuler
          </Button>
          <HoldToDeleteButton
            onConfirm={refuse}
            title="Maintenir pour envoyer le refus"
            mobileConfirm={false}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-white shadow-sm hover:bg-destructive/90"
          >
            Envoyer
          </HoldToDeleteButton>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminSuggestions;

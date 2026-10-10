import { useState } from "react";
import useAccessRequests, {
  AccessRequest,
  RequestType,
} from "@/hooks/useAccessRequests";
import useUserNames from "@/hooks/useUserNames";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import AccessRequestDialog from "./AccessRequestDialog";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";

/** Nature d'une demande d'accès : une pastille, comme bug / idée côté Demandes. */
export const ACCESS_KINDS: Record<RequestType, { label: string; dot: string }> = {
  creation: { label: "Inscription", dot: "bg-emerald-500" },
  password_reset: { label: "Mot de passe", dot: "bg-slate-400" },
};

const ACCESS_STATES = {
  Waiting: { label: "En attente", chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  Accepted: { label: "Acceptée", chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  Rejected: { label: "Refusée", chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
} as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Demandes d'accès — inscriptions et mots de passe oubliés — dans une seule
 * table, tenue comme celle des Demandes : nature (pastille verte / grise),
 * date, utilisateur, état. Un clic ouvre les actions : accepter ou refuser tant
 * qu'elle attend, supprimer une fois traitée.
 */
const AdminAccessRequests = () => {
  const { nameOf } = useUserNames();
  const { data: requests = [], isPending, error } = useAccessRequests();
  const [actionsFor, setActionsFor] = useState<AccessRequest | null>(null);

  // Tri par colonne ; par défaut, la plus récente d'abord.
  const { sort, toggle, firstDir } = useTableSort<"type" | "date" | "who" | "state">(
    "access-requests",
    { key: "date", dir: "desc" },
  );
  const rows = sortRows(requests, sort, (r, key) =>
    key === "type"
      ? ACCESS_KINDS[r.type].label
      : key === "date"
        ? Date.parse(r.created_at)
        : key === "who"
          ? nameOf(r.email)
          : // En attente d'abord, puis acceptée, puis refusée.
            ["Waiting", "Accepted", "Rejected"].indexOf(r.state),
  );

  return (
    <div className="tw-scope flex h-full w-full flex-col sm:px-4 sm:pb-4">
      {isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-10 text-center text-foreground/60">Aucune demande d'accès.</p>
      ) : (
        <div className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="min-h-0 os-grid"
            // Pas de colonne Actions : l'horizontale va au bord.
            style={{ ["--grid-right" as string]: "0px" }}
          >
            <table
              className="admin-table w-full border-separate border-spacing-0 text-center text-sm"
              style={{ ["--admin-min-w" as string]: "340px" }}
            >
              <thead>
                <tr>
                  {(
                    [
                      { key: "type", label: "Nature" },
                      { key: "date", label: "Date" },
                      { key: "who", label: "Utilisateur" },
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
                        // Nature : la pastille de couleur se passe d'intitulé.
                        hideLabel={c.key === "type"}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((req) => {
                  const kind = ACCESS_KINDS[req.type];
                  const state = ACCESS_STATES[req.state];
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setActionsFor(req)}
                      aria-label="Actions sur cette demande"
                      className={cn(
                        "cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60",
                        // Ce qui attend l'admin se lit en pleine couleur.
                        req.state === "Waiting" && "[&>td]:text-foreground",
                      )}
                    >
                      <td className="w-10 whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4">
                        <span
                          aria-label={kind.label}
                          className={cn("mx-auto block h-2.5 w-2.5 rounded-full", kind.dot)}
                        />
                        <span className="sr-only">{kind.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {formatDate(req.created_at)}
                      </td>
                      {/* Nom tiré de l'email, y compris pour une inscription
                          (compte pas encore créé) : l'email est dans la popup. */}
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4 text-foreground/70">
                        {nameOf(req.email)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 first:pl-4 last:pr-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            state.chip,
                          )}
                        >
                          {state.label}
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

      <AccessRequestDialog request={actionsFor} onClose={() => setActionsFor(null)} />
    </div>
  );
};

export default AdminAccessRequests;

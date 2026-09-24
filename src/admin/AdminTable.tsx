import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BsBan } from "react-icons/bs";
import supabaseClient from "../services/supabaseClient";
import badgeMap, { orderBadges } from "../services/badgeMap";
import { tagCategoryLabel } from "../services/tagCategories";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import RowActionsDialog from "./RowActionsDialog";
import { sortRows, useTableSort } from "./tableSort";
import { SortHeader } from "./SortHeader";
import useRealtimeTable from "../hooks/useRealtimeTable";

interface AdminTableProps {
  tableName: string;
  columns?: string[];
  onEdit?: (data: any) => void;
  onDelete?: (row: any) => void;
}

/** En-têtes lisibles pour les colonnes dont le nom technique parle peu. */
const columnLabels: Record<string, string> = { category: "catégorie" };

const AdminTable = ({ tableName, columns, onEdit, onDelete }: AdminTableProps) => {
  const queryClient = useQueryClient();

  // Temps réel : la table se rafraîchit dès qu'une ligne change, d'où qu'elle
  // vienne (un autre admin, un autre onglet). Sans événement — table absente de
  // la publication realtime — on retombe simplement sur l'ancien comportement.
  useRealtimeTable(tableName, () =>
    queryClient.invalidateQueries({ queryKey: ["table", tableName] })
  );

  // Ligne dont la popup d'actions est ouverte (clic sur la ligne).
  const [actionsFor, setActionsFor] = useState<Record<string, unknown> | null>(
    null
  );

  const isBadgeColumn = (col: string) =>
    col.toLowerCase() === "badges" || col.toLowerCase().includes("badge");

  const cleanUrlText = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const {
    data = [],
    isPending: loading,
    error: queryError,
  } = useQuery<any[], Error>({
    queryKey: ["table", tableName, columns],
    queryFn: async () => {
      let orderField = "label";
      if (tableName === "restaurants") orderField = "slug";
      else if (tableName === "waiting_list") orderField = "email";

      const { data, error } = await supabaseClient
        .from(tableName)
        .select(columns?.join(",") || "*")
        .order(orderField);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Tri par colonne (3e clic = ordre de la requête). Les colonnes sont
  // dynamiques : la clé de tri EST le nom de la colonne.
  const { sort, toggle } = useTableSort<string>();

  const error = queryError ? queryError.message : "";
  const columnNames = data.length > 0 ? columns ?? Object.keys(data[0]) : [];
  const visibleColumns = columnNames.filter((c) => c !== "id");
  // Plancher, pas une largeur cible : les colonnes s'étalent sur la largeur
  // disponible et se rapprochent quand l'écran rétrécit ; en dessous, la
  // ScrollArea reprend la main. 110 px par colonne.
  const minWidth = visibleColumns.length * 110;
  // Une cellule peut porter un tableau (tags, badges) : on trie sur son texte.
  const rows = sortRows(data, sort, (row, key) => {
    const value = row[key];
    return Array.isArray(value) ? value.join(", ") : value;
  });

  if (loading) {
    return (
      <div className="tw-scope flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="tw-scope p-4 text-center text-destructive">Erreur : {error}</p>;
  }

  if (data.length === 0) {
    return (
      <p className="tw-scope p-4 text-center text-foreground/60">
        Aucune donnée dans la table « {tableName} ».
      </p>
    );
  }

  return (
    <div className="tw-scope flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
      <ScrollArea
        className="min-h-0 os-grid"
        // La barre verticale démarre sous l'entête figée ; l'horizontale va
        // jusqu'au bord, faute de colonne Actions à contourner.
        style={{ ["--grid-right" as string]: "0px" }}
      >
        <table
          className="w-full border-separate border-spacing-0 text-center text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 z-10 bg-muted px-2 py-3 first:pl-4 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]"
                >
                  <SortHeader
                    label={columnLabels[col] ?? col}
                    dir={sort?.key === col ? sort.dir : null}
                    onClick={() => toggle(col)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                // Clic sur la ligne = ce qu'on peut en faire (modifier,
                // supprimer), comme les autres tables admin.
                onClick={() => setActionsFor(row)}
                aria-label="Actions sur cette ligne"
                className="cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60"
              >
                {visibleColumns.map((col) => {
                  const value = row[col];
                  const isImage =
                    typeof value === "string" &&
                    (value.startsWith("http") || value.startsWith("/")) &&
                    col.toLowerCase().includes("image");
                  const isWebsite =
                    typeof value === "string" &&
                    col.toLowerCase().includes("website");

                  return (
                    <td key={col} className="px-2 py-1.5 first:pl-4 last:pr-4 align-middle text-foreground/90">
                      {value === null || value === undefined || value === "" ? (
                        <BsBan className="text-foreground/30" />
                      ) : isImage ? (
                        <img
                          src={value}
                          alt={col}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : col === "category" ? (
                        <Badge variant="muted">{tagCategoryLabel(value)}</Badge>
                      ) : isWebsite ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {cleanUrlText(value)}
                        </a>
                      ) : Array.isArray(value) &&
                        value.every((v) => typeof v === "string") ? (
                        isBadgeColumn(col) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {orderBadges(value as string[]).map((b) => (
                              <img
                                key={b}
                                src={badgeMap[b]}
                                alt={b}
                                className="h-4 w-4 object-contain"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {value.map((tag: string, i: number) => (
                              <Badge key={i} variant="primary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )
                      ) : (
                        String(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* Actions de la ligne cliquée. Les deux ouvrent une autre popup
          (formulaire, confirmation) : on referme celle-ci d'abord. */}
      <RowActionsDialog
        open={!!actionsFor}
        onClose={() => setActionsFor(null)}
        title={
          actionsFor ? String(actionsFor[visibleColumns[0]] ?? "") : ""
        }
        actions={
          actionsFor
            ? [
                {
                  key: "edit",
                  label: "Modifier",
                  tone: "primary",
                  // Ouvre le formulaire : il remplace cette popup.
                  onSelect: () => onEdit?.(actionsFor),
                },
                {
                  key: "delete",
                  label: "Supprimer",
                  tone: "destructive",
                  // Ouvre la confirmation : elle remplace cette popup.
                  onSelect: () => onDelete?.(actionsFor),
                },
              ]
            : []
        }
      />
    </div>
  );
};

export default AdminTable;

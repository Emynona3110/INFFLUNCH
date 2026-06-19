import { useQuery } from "@tanstack/react-query";
import { FaTrash } from "react-icons/fa";
import { BsBan } from "react-icons/bs";
import supabaseClient from "../services/supabaseClient";
import badgeMap from "../services/badgeMap";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminTableProps {
  tableName: string;
  columns?: string[];
  onEdit?: (data: any) => void;
  onDelete?: (id: number) => void;
}

const AdminTable = ({ tableName, columns, onEdit, onDelete }: AdminTableProps) => {
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

  const error = queryError ? queryError.message : "";
  const columnNames = data.length > 0 ? columns ?? Object.keys(data[0]) : [];
  const visibleColumns = columnNames.filter((c) => c !== "id");
  const minWidth = visibleColumns.length * 150 + 130;

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
    <div className="tw-scope h-full overflow-hidden rounded-card border border-border bg-card">
      <ScrollArea
        className="h-full os-grid"
        style={{ ["--grid-right" as string]: "117px" }}
      >
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 z-10 bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]"
                >
                  {col}
                </th>
              ))}
              <th className="sticky right-0 top-0 z-20 w-px whitespace-nowrap bg-muted px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_1px_0_0_0_var(--border),inset_0_-1px_0_0_var(--border)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60"
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
                    <td key={col} className="px-4 py-3 align-middle text-foreground/90">
                      {value === null || value === undefined || value === "" ? (
                        <BsBan className="text-foreground/30" />
                      ) : isImage ? (
                        <img
                          src={value}
                          alt={col}
                          className="h-10 w-10 rounded-md object-cover"
                        />
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
                            {value.map(
                              (b: string) =>
                                badgeMap[b] && (
                                  <img
                                    key={b}
                                    src={badgeMap[b]}
                                    alt={b}
                                    className="h-4 w-4 object-contain"
                                  />
                                )
                            )}
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
                <td className="sticky right-0 z-[1] w-px whitespace-nowrap bg-card px-4 py-3 text-center align-middle shadow-[inset_1px_0_0_0_var(--border)]">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      aria-label="Modifier"
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border text-base leading-none text-foreground/70 transition hover:bg-muted"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                      aria-label="Supprimer"
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};

export default AdminTable;

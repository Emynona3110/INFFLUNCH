import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tableau admin en chargement : même cadre, en-tête grisé de même hauteur
 * (py-3 + text-xs) et lignes de même hauteur (py-1.5) que `.admin-table`.
 */
export default function AdminTableSkeleton({
  cols = 4,
  rows = 8,
}: {
  cols?: number;
  rows?: number;
}) {
  const cells = (h: string) =>
    Array.from({ length: cols }, (_, c) => (
      <div key={c} className="flex flex-1 justify-center first:justify-start">
        <Skeleton className={`${h} w-3/5 max-w-28`} />
      </div>
    ));
  return (
    <div
      className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card"
      role="status"
      aria-label="Chargement"
    >
      <div className="flex h-10 shrink-0 items-center gap-2 bg-muted px-2.5 shadow-[inset_0_-1px_0_0_var(--border)] sm:px-4">
        {cells("h-3")}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex h-[41px] shrink-0 items-center gap-2 border-t border-border/60 px-2.5 first:border-t-0 sm:px-4"
        >
          {cells("h-3.5")}
        </div>
      ))}
    </div>
  );
}

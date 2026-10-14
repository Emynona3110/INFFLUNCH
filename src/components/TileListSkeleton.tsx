import { Skeleton } from "@/components/ui/skeleton";

/**
 * Liste de tuiles en chargement (Mes demandes, Mes ajouts, Mes avis) : même
 * gabarit que les vraies — lignes bord à bord séparées par un filet sur
 * mobile, tuiles bordées espacées sur desktop.
 */
export default function TileListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul
      className="m-0 list-none divide-y divide-border p-0 sm:space-y-2 sm:divide-y-0"
      role="status"
      aria-label="Chargement"
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex min-h-[60px] items-center gap-3 px-3 py-2.5 sm:min-h-0 sm:rounded-xl sm:border sm:border-border sm:bg-background sm:p-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-36 sm:w-48" />
              <Skeleton className="ml-auto h-[18px] w-16 rounded-full sm:ml-0" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}

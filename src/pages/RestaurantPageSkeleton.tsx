import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_BODY,
  SECTION_BODY_PAD,
  SECTION_HEAD,
} from "@/lib/sectionClasses";

/** Titre de section : petit libellé sur mobile, titre de carte sur desktop. */
const SectionTitle = ({ w = "w-28 sm:w-40" }: { w?: string }) => (
  <div className={SECTION_HEAD}>
    <Skeleton className={cn("h-3.5 sm:h-6", w)} />
  </div>
);

/** Fiche resto en chargement : même grille et mêmes hauteurs que la vraie. */
export default function RestaurantPageSkeleton() {
  return (
    <div
      className="tw-scope mx-auto w-full max-w-[1100px] pb-4"
      role="status"
      aria-label="Chargement du restaurant"
    >
      {/* Lien retour */}
      <Skeleton className="mb-3 h-5 w-40 sm:mb-4" />

      {/* Hero */}
      <div className="relative h-[220px] overflow-hidden rounded-card border border-border sm:h-[380px]">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-7">
          <div className="mb-2 flex gap-1 sm:mb-3 sm:gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full sm:h-6" />
            <Skeleton className="h-5 w-20 rounded-full sm:h-6" />
          </div>
          <Skeleton className="h-7 w-48 sm:h-10 sm:w-72" />
        </div>
      </div>

      {/* Rangée Déjeuner / itinéraire */}
      <div className="mt-2.5 flex items-center justify-end gap-2.5 sm:mt-4 sm:gap-3">
        <Skeleton className="h-9 w-36 rounded-full sm:h-[42px] sm:w-44" />
        <Skeleton className="h-9 w-9 rounded-full sm:hidden" />
      </div>

      <div className="mt-2.5 grid gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
          {/* Photos : 3 vignettes carrées */}
          <section className={cn("order-3", SECTION)}>
            <SectionTitle />
            <div className={cn(SECTION_BODY, "flex gap-px sm:gap-2")}>
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="aspect-square flex-1 rounded-none sm:rounded-xl"
                />
              ))}
            </div>
          </section>

          {/* Avis */}
          <section className={cn("order-4", SECTION)}>
            <SectionTitle w="w-36 sm:w-56" />
            <div className={cn(SECTION_BODY_PAD, "space-y-3 sm:space-y-4")}>
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-2 flex flex-col gap-3 self-start sm:gap-6 lg:col-start-3 lg:row-start-1">
          {/* Infos pratiques */}
          <section className={SECTION}>
            <SectionTitle />
            <div className={cn(SECTION_BODY_PAD, "space-y-3")}>
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </section>

          {/* Menu */}
          <section className={SECTION}>
            <SectionTitle w="w-16 sm:w-24" />
            <div className={cn(SECTION_BODY_PAD, "space-y-2")}>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </section>

          {/* Carte (desktop seulement, comme la vraie) */}
          <section className="hidden overflow-hidden rounded-card border border-border bg-card sm:block">
            <div className="border-b border-border px-5 py-3">
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-60 w-full rounded-none" />
          </section>
        </aside>
      </div>
    </div>
  );
}

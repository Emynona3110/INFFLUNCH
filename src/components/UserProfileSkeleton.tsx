import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTION, SECTION_BODY, SECTION_HEAD } from "@/lib/sectionClasses";

/** Profil en chargement : carte d'identité (avatar 64/96 px, nom, compteurs)
 *  et bandeau des succès, aux dimensions du vrai profil. */
export default function UserProfileSkeleton() {
  return (
    <>
      <Card className="p-4 sm:p-8" role="status" aria-label="Chargement du profil">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-40 sm:h-8 sm:w-56" />
            <Skeleton className="h-3.5 w-32 sm:h-4" />
            <div className="flex gap-4 pt-1 sm:gap-5 sm:pt-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-8 sm:w-16" />
              ))}
            </div>
          </div>
        </div>
      </Card>
      <section className={cn(SECTION, "sm:p-6")}>
        <div className={SECTION_HEAD}>
          <Skeleton className="h-3.5 w-16 sm:h-6 sm:w-24" />
        </div>
        <div className={cn(SECTION_BODY, "flex gap-2 p-3 sm:grid sm:grid-cols-9 sm:p-0")}>
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-14 w-14 shrink-0 rounded-xl sm:aspect-square sm:h-auto sm:w-full"
            />
          ))}
        </div>
      </section>
    </>
  );
}

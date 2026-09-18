import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { changelog, ChangelogEntry } from "@/data/changelog";
import useChangelogSeen from "@/hooks/useChangelogSeen";
import { Card } from "@/components/ui/card";

/** Libellé de mois "Juin 2026" (première lettre en majuscule). */
const monthLabel = (iso: string) => {
  const s = new Date(iso).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Regroupe les entrées (déjà triées plus récent → ancien) par mois. */
const groupByMonth = (entries: ChangelogEntry[]) => {
  const groups: { key: string; label: string; items: ChangelogEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.date.slice(0, 7); // "AAAA-MM"
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(entry);
    else groups.push({ key, label: monthLabel(entry.date), items: [entry] });
  }
  return groups;
};

/**
 * Section « Nouveautés » : frise verticale (ligne + points bleus) à gauche.
 * Les mois apparaissent comme des ÉTAPES (nœud + libellé) au-dessus de leurs
 * blocs ; chaque nouveauté est un cadre (titre + sous-points listés). Contenu en
 * dur dans data/changelog.ts. Marque les nouveautés comme vues au montage.
 */
const Nouveautes = () => {
  const { markSeen, seenAt } = useChangelogSeen();
  const groups = useMemo(() => groupByMonth(changelog), []);

  // Pastille sur chaque nouveauté parue depuis la dernière visite. On fige la
  // date « vue » telle qu'elle était à l'OUVERTURE : tout est marqué vu dès
  // l'arrivée, les pastilles doivent pourtant rester le temps de la lecture.
  const seenAtOnOpen = useRef<string | null>(null);
  useEffect(() => {
    if (seenAtOnOpen.current === null && seenAt !== null)
      seenAtOnOpen.current = seenAt;
  }, [seenAt]);
  const isNew = (date: string) =>
    seenAtOnOpen.current !== null && date > seenAtOnOpen.current;

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Frise : rail + nœuds. rail et nœuds partagent la même origine
          horizontale (left-3, centrés via -translate-x-1/2). Le rail démarre au
          centre du PREMIER nœud (l'étape du mois le plus récent). */}
      <div className="relative">
        <span className="absolute bottom-4 left-2 top-[11px] w-px -translate-x-1/2 bg-border sm:left-3" />

        <div className="space-y-4 sm:space-y-8">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2.5 sm:space-y-4">
              {/* Étape : libellé du mois (sans nœud). */}
              <div className="pl-5 sm:pl-8">
                <div
                  role="heading"
                  aria-level={2}
                  className="font-display text-xs font-bold uppercase tracking-wide text-foreground/50 sm:text-sm"
                >
                  {group.label}
                </div>
              </div>

              {/* Blocs du mois (un par nouveauté). */}
              {group.items.map((entry, i) => (
                <div key={`${entry.date}-${i}`} className="relative pl-5 sm:pl-8">
                  <span className="absolute left-2 top-5 h-2 w-2 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background sm:left-3 sm:top-6 sm:h-2.5 sm:w-2.5" />

                  <Card className="relative px-3 py-3 sm:px-5 sm:py-4">
                    {isNew(entry.date) && (
                      <span
                        aria-label="Nouveauté non lue"
                        className="absolute -right-1 -top-1 z-[1] h-3 w-3 rounded-full bg-primary ring-2 ring-card"
                      />
                    )}
                    <div
                      role="heading"
                      aria-level={3}
                      className="font-display text-sm font-bold leading-snug text-card-foreground sm:text-base"
                    >
                      {entry.title}
                    </div>
                    <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-foreground/70 marker:text-foreground/35 sm:pl-5 sm:text-sm">
                      {entry.points.map((point, j) => (
                        <li key={j}>{point}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Nouveautes;

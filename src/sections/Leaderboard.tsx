import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import StreakAvatar from "@/components/StreakAvatar";
import { SortHeader } from "@/admin/SortHeader";
import { sortRows, useTableSort } from "@/admin/tableSort";
import useLeaderboard, {
  LeaderboardPeriod,
  LeaderboardRow,
} from "@/hooks/useLeaderboard";
import useSession from "@/hooks/useSession";
import useRealtimeTable from "@/hooks/useRealtimeTable";
import { formatAuthorName } from "@/utils/authorName";
import { profilePath } from "@/utils/profilePath";
import { cn } from "@/lib/utils";

type Metric = Exclude<
  keyof LeaderboardRow,
  "user_id" | "email" | "avatar_path" | "streak"
>;
type ColKey = "user" | Metric;

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "user", label: "Utilisateur" },
  { key: "lunches", label: "Midis" },
  { key: "reviews", label: "Avis" },
  { key: "photos", label: "Photos" },
  { key: "achievements", label: "Succès" },
];
const METRICS = COLUMNS.filter((c) => c.key !== "user") as {
  key: Metric;
  label: string;
}[];

/** Recherche insensible à la casse et aux accents. */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Classement des collègues, sur un mois (calendaire) ou depuis toujours.
 * Même table que l'admin (tri par colonne, chevrons) : par défaut les midis,
 * chaque colonne chiffrée se trie d'abord du plus grand au plus petit. La pp
 * porte l'effet de série de midis (flamme), comme sur le profil.
 */
interface Props {
  period: LeaderboardPeriod;
  /** Recherche validée dans la barre d'outils (LeaderboardToolbar). */
  search: string;
}

/** Durée du fondu des lignes au changement de période. */
const FADE_MS = 180;
/** Décalage entre deux lignes à la réapparition, et nombre de lignes décalées. */
const STAGGER_MS = 30;
const STAGGER_MAX = 15;

const Leaderboard = ({ period, search }: Props) => {
  const navigate = useNavigate();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;
  const {
    data = [],
    isPending,
    isPlaceholderData,
    error,
  } = useLeaderboard(period);
  // Temps réel : tout changement d'une table comptée relance le classement.
  // Les événements arrivent souvent en rafale (un midi déclaré débloque un
  // succès…) : un seul refetch par salve. Les succès des AUTRES ne sont pas
  // diffusés (RLS : chacun ne reçoit que les siens) — d'où aussi le
  // rafraîchissement périodique de useLeaderboard.
  const queryClient = useQueryClient();
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refresh = () => {
    clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-first-month"] });
    }, 800);
  };
  useEffect(() => () => clearTimeout(pending.current), []);
  useRealtimeTable("lunch_plans", refresh);
  useRealtimeTable("reviews", refresh);
  useRealtimeTable("restaurant_photos", refresh);
  useRealtimeTable("user_achievements", refresh);

  const {
    sort: chosen,
    toggle,
    firstDir,
  } = useTableSort<ColKey>(
    "leaderboard",
    { key: "lunches", dir: "desc" },
    (key) => (key === "user" ? "asc" : "desc"),
  );

  // Colonne triée vide sur la période (que des 0, ex. aucun midi ce mois-là) :
  // on trie sur la suivante qui a du contenu (Midis → Avis → Photos →
  // Succès, en boucle). Le tri choisi reste retenu et revient dès qu'il a de
  // quoi trier ; le chevron, lui, montre le tri appliqué.
  const sort = useMemo(() => {
    if (chosen.key === "user" || data.length === 0) return chosen;
    const start = METRICS.findIndex((m) => m.key === chosen.key);
    for (let i = 0; i < METRICS.length; i++) {
      const key = METRICS[(start + i) % METRICS.length].key;
      if (data.some((r) => r[key] > 0))
        return key === chosen.key ? chosen : { key, dir: firstDir(key) };
    }
    return chosen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.key, chosen.dir, data]);

  // Changement de période OU de tri : seules les LIGNES s'effacent (vers le
  // fond, blanc ou sombre selon le thème) — en-tête, cadre et barre de
  // défilement restent en place —, puis la nouvelle vue apparaît en cascade
  // dès que ses données sont là. Pendant l'effacement, on garde à l'écran
  // les lignes quittées (instantané). Un refetch (temps réel) ne change pas
  // de vue : pas de fondu.
  const viewKey = `${period}|${sort.key}|${sort.dir}`;
  const [shownView, setShownView] = useState(viewKey);
  const settled = shownView === viewKey;
  const [fadedOut, setFadedOut] = useState(false);
  // Cascade d'apparition active seulement juste après un changement de vue
  // (et au premier affichage) : réordonner des lignes (temps réel)
  // relancerait sinon l'animation des lignes déplacées.
  // Déduit au rendu, pas posé par un effet : sinon le nouveau tbody
  // s'affichait une image plein opaque avant que la cascade ne démarre.
  const [cascadeDoneFor, setCascadeDoneFor] = useState<string | null>(null);
  const cascading = cascadeDoneFor !== shownView;
  useEffect(() => {
    const id = setTimeout(
      () => setCascadeDoneFor(shownView),
      STAGGER_MAX * STAGGER_MS + FADE_MS + 50,
    );
    return () => clearTimeout(id);
  }, [shownView]);

  // Fin de l'effacement : au bout de la transition CSS (FADE_MS).
  useEffect(() => {
    if (settled) return;
    const id = setTimeout(() => setFadedOut(true), FADE_MS);
    return () => clearTimeout(id);
  }, [settled]);
  useEffect(() => {
    if (settled) setFadedOut(false);
    else if (fadedOut && !isPlaceholderData) {
      setShownView(viewKey);
      setFadedOut(false);
    }
  }, [settled, fadedOut, isPlaceholderData, viewKey]);

  // Colonnes vides sur la période (que des 0) : rien à y trier.
  const emptyCols = useMemo(
    () =>
      new Set<ColKey>(
        data.length
          ? METRICS.filter((m) => data.every((r) => r[m.key] === 0)).map(
              (m) => m.key,
            )
          : [],
      ),
    [data],
  );

  // Ordre de base par nom : il départage les ex æquo (tri stable).
  const byName = useMemo(
    () =>
      [...data].sort((a, b) =>
        formatAuthorName(a.email).localeCompare(
          formatAuthorName(b.email),
          "fr",
        ),
      ),
    [data],
  );

  const needle = fold(search.trim());
  // Égalités : départagées d'abord par le total des quatre colonnes, puis par
  // les autres colonnes chiffrées de gauche à droite, toujours dans le sens
  // du tri ; enfin par nom (ordre de base, tri stable).
  type TieKey = ColKey | "total";
  const tieKeys: TieKey[] = [
    "total",
    ...METRICS.map((m) => m.key).filter((k) => k !== sort.key),
  ];
  const liveRows = sortRows<LeaderboardRow, TieKey>(
    needle
      ? byName.filter((r) => fold(formatAuthorName(r.email)).includes(needle))
      : byName,
    sort,
    (r, key) =>
      key === "user"
        ? formatAuthorName(r.email)
        : key === "total"
          ? METRICS.reduce((sum, m) => sum + r[m.key], 0)
          : r[key],
    tieKeys,
  );
  // Instantané de ce qui est affiché, rejoué pendant l'effacement.
  const snapshot = useRef({ rows: liveRows, sortKey: sort.key as ColKey });
  if (settled) snapshot.current = { rows: liveRows, sortKey: sort.key };
  const { rows, sortKey } = snapshot.current;

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      {isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : (
        // Cadre à pleine hauteur, quel que soit le nombre de lignes : il ne
        // bouge pas quand une recherche en laisse plus ou moins. La barre de défilement flotte (OverlayScrollbars) :
        // l'apparition ne décale rien.
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="min-h-0 os-grid"
            style={{ ["--grid-right" as string]: "0px" }}
          >
            <table
              className="admin-table w-full border-separate border-spacing-0 text-center text-sm"
              style={{ ["--admin-min-w" as string]: "560px" }}
            >
              {/* Colonnes chiffrées de même largeur : sans ça, chacune prend
                  la largeur de son intitulé et les écarts varient. */}
              <colgroup>
                <col />
                {METRICS.map((m) => (
                  <col
                    key={m.key}
                    style={{ width: `${68 / METRICS.length}%` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "sticky top-0 z-10 bg-muted px-2 py-3 first:pl-4 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        // Le nom reste visible quand la table défile en largeur.
                        c.key === "user" && "left-0 z-20 text-left",
                      )}
                    >
                      <SortHeader
                        label={c.label}
                        dir={sort.key === c.key ? sort.dir : null}
                        idleDir={firstDir(c.key)}
                        disabled={emptyCols.has(c.key)}
                        onClick={() => toggle(c.key, sort)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Seul le CONTENU des cellules s'estompe (`--lb-o`, lu par
                  `.lb-cell`) : une opacité sur le tbody le recomposait à part
                  sous l'en-tête et la colonne figés — d'où des éclairs. */}
              <tbody
                // Nouvelle vue (période, tri) = tbody neuf : chaque ligne y JOUE son
                // animation d'apparition (une transition ne se jouait pas sur
                // les lignes déplacées par le nouveau tri).
                key={shownView}
                className={cn(cascading && "lb-cascade")}
                style={
                  {
                    "--lb-o": settled ? 1 : 0,
                    "--lb-ms": `${FADE_MS}ms`,
                  } as React.CSSProperties
                }
              >
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="px-4 py-6 text-foreground/50"
                    >
                      <span className="lb-cell">Aucun collègue trouvé.</span>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const me = r.user_id === myId;
                    // Rien sur la période : ligne légèrement grisée.
                    const idle = METRICS.every((m) => r[m.key] === 0);
                    return (
                      <tr
                        key={r.user_id}
                        // Apparition en cascade, ligne après ligne (comme les
                        // tuiles des restos) ; l'effacement, lui, est d'un
                        // bloc. Plafonné : au-delà, les lignes sont hors écran.
                        style={
                          {
                            "--lb-d": `${Math.min(i, STAGGER_MAX) * STAGGER_MS}ms`,
                          } as React.CSSProperties
                        }
                        onClick={() =>
                          navigate(profilePath(r.user_id, r.email))
                        }
                        aria-label={`Voir le profil de ${formatAuthorName(r.email)}`}
                        className={cn(
                          "cursor-pointer transition [&>td]:border-t [&>td]:border-border/60",
                          // Fonds OPAQUES : la 1re colonne, figée, passe
                          // par-dessus les autres au défilement horizontal.
                          // Ma ligne : teinte portée par `.lb-me`, qui suit le
                          // fondu (sinon on la voyait sauter de place).
                          me
                            ? "lb-me"
                            : "[&>td]:bg-card hover:[&>td]:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]",
                        )}
                      >
                        <td className="sticky left-0 z-[5] px-2 py-1.5 first:pl-4 text-left">
                          <span className="lb-cell flex items-center gap-2">
                            {/* Opacité sur un enfant : celle de `.lb-cell`
                                porte le fondu, on ne la remplace pas. */}
                            <span className={cn(idle && "opacity-50")}>
                              <StreakAvatar
                                email={r.email}
                                avatarPath={r.avatar_path}
                                streak={r.streak}
                                size={28}
                                compact
                              />
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap",
                                me
                                  ? "font-semibold text-foreground"
                                  : idle
                                    ? "text-foreground/45"
                                    : "text-foreground/90",
                              )}
                            >
                              {formatAuthorName(r.email)}
                            </span>
                          </span>
                        </td>
                        {METRICS.map((m) => (
                          <td
                            key={m.key}
                            className={cn(
                              "px-2 py-1.5 last:pr-4 tabular-nums",
                              r[m.key] === 0
                                ? "text-foreground/30"
                                : m.key === sortKey
                                  ? "font-semibold text-foreground"
                                  : "text-foreground/80",
                            )}
                          >
                            <span className="lb-cell">
                              {r[m.key] === 0 ? "-" : r[m.key]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

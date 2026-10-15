import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiAward, FiCamera, FiHeart, FiStar } from "react-icons/fi";
import { LuUtensils } from "react-icons/lu";
import { ScrollArea } from "@/components/ui/scroll-area";
import StreakAvatar from "@/components/StreakAvatar";
import { SortHeader } from "@/admin/SortHeader";
import { sortRows, useTableSort } from "@/admin/tableSort";
import useLeaderboard, {
  LeaderboardKind,
  LeaderboardPeriod,
  LeaderboardRow,
  RestaurantLeaderboardRow,
  useRestaurantLeaderboard,
} from "@/hooks/useLeaderboard";
import useSession from "@/hooks/useSession";
import useRealtimeTable from "@/hooks/useRealtimeTable";
import useUserNames from "@/hooks/useUserNames";
import usePrefetch from "@/hooks/usePrefetch";
import { profilePath } from "@/utils/profilePath";
import { restaurantPath } from "@/utils/restaurantPath";
import { isRickSearch, RICK_ROW } from "@/data/rickAstley";
import noImage from "@/assets/no-image-thumb.webp";
import { resizedImgProps, IMG_THUMB } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import { useScreenLoader } from "@/components/brand/ScreenLoader";

type Metric = "lunches" | "reviews" | "photos" | "achievements" | "favorites";
type ColKey = "name" | Metric;

// Sur mobile, les colonnes chiffrées s'intitulent par leur symbole (ceux des
// compteurs du profil) : la table tient sans défiler en largeur.
const ICON = "h-4 w-4";
type Column = { key: ColKey; label: string; icon?: React.ReactNode };
const COUNTS: Column[] = [
  { key: "lunches", label: "Midis", icon: <LuUtensils className={ICON} /> },
  { key: "reviews", label: "Avis", icon: <FiStar className={ICON} /> },
  { key: "photos", label: "Photos", icon: <FiCamera className={ICON} /> },
];
// Restaurants : mêmes colonnes que les collègues, les favoris à la place des
// succès.
const COLUMNS: Record<LeaderboardKind, Column[]> = {
  users: [
    { key: "name", label: "Utilisateurs" },
    ...COUNTS,
    { key: "achievements", label: "Succès", icon: <FiAward className={ICON} /> },
  ],
  restaurants: [
    { key: "name", label: "Restaurants" },
    ...COUNTS,
    { key: "favorites", label: "Favoris", icon: <FiHeart className={ICON} /> },
  ],
};
const metricsOf = (kind: LeaderboardKind) =>
  COLUMNS[kind].filter((c) => c.key !== "name") as {
    key: Metric;
    label: string;
    icon: React.ReactNode;
  }[];

/** Ligne commune aux deux classements. */
interface Row {
  id: string;
  name: string;
  /** Libellé mobile : trigramme d'un collègue, nom d'un resto. */
  short: string;
  path: string;
  me: boolean;
  values: Partial<Record<Metric, number>>;
  user?: LeaderboardRow;
  restaurant?: RestaurantLeaderboardRow;
}

/** Recherche insensible à la casse et aux accents. */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const val = (r: Row, key: Metric) => r.values[key] ?? 0;

/**
 * Classement des collègues ou des restaurants, sur un mois (calendaire) ou
 * depuis toujours. Même table que l'admin (tri par colonne, chevrons) : par
 * défaut les midis, chaque colonne chiffrée se trie d'abord du plus grand au
 * plus petit. La pp d'un collègue porte l'effet de série de midis (flamme),
 * comme sur le profil.
 */
interface Props {
  kind: LeaderboardKind;
  period: LeaderboardPeriod;
  /** Recherche validée dans la barre d'outils (LeaderboardToolbar). */
  search: string;
}

/** Durée du fondu des lignes au changement de période. */
const FADE_MS = 180;
/** Décalage entre deux lignes à la réapparition, et nombre de lignes décalées. */
const STAGGER_MS = 30;
const STAGGER_MAX = 15;

const Leaderboard = ({ kind, period, search }: Props) => {
  const { nameOf, trigramOf } = useUserNames();
  const navigate = useNavigate();
  const { prefetchRestaurant } = usePrefetch();
  const { sessionData } = useSession();
  const myId = sessionData?.user?.id;
  // Les deux classements sont chargés : basculer de l'un à l'autre n'attend
  // pas le réseau. Seul celui affiché se rafraîchit périodiquement.
  const users = useLeaderboard(period, kind === "users");
  const restaurants = useRestaurantLeaderboard(period, kind === "restaurants");
  const active = kind === "users" ? users : restaurants;
  const { isPlaceholderData, error } = active;
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

  const METRICS = metricsOf(kind);

  // Lignes des deux classements, ramenées à un même format.
  const data = useMemo<Row[]>(() => {
    if (kind === "restaurants")
      return (restaurants.data ?? []).map((r) => ({
        id: String(r.id),
        name: r.name,
        short: r.name,
        path: restaurantPath(r.slug),
        me: false,
        values: {
          lunches: r.lunches,
          reviews: r.reviews,
          photos: r.photos,
          favorites: r.favorites,
        },
        restaurant: r,
      }));
    const toRow = (r: LeaderboardRow): Row => ({
      id: r.user_id,
      name: nameOf(r.email),
      short: trigramOf(r.email),
      path: profilePath(r.user_id, r.email),
      me: r.user_id === myId,
      values: {
        lunches: r.lunches,
        reviews: r.reviews,
        photos: r.photos,
        achievements: r.achievements,
      },
      user: r,
    });
    // Rick Astley, collègue fictif, ne se montre qu'à qui le cherche (succès
    // secret).
    return [
      ...(users.data ?? []),
      ...(isRickSearch(search) ? [RICK_ROW] : []),
    ].map(toRow);
  }, [kind, users.data, restaurants.data, search, nameOf, trigramOf, myId]);

  const {
    sort: chosen,
    toggle,
    firstDir,
  } = useTableSort<Metric>(
    kind === "users" ? "leaderboard" : "leaderboard-restaurants",
    { key: "lunches", dir: "desc" },
    // Pas de tri par nom (un classement alphabétique n'a pas de sens) :
    // seules les colonnes chiffrées se trient, du plus grand au plus petit.
    () => "desc",
  );

  // Colonne triée vide sur la période (que des 0, ex. aucun midi ce mois-là) :
  // on trie sur la suivante qui a du contenu (Midis → Avis → Photos →
  // Succès/Favoris, en boucle). Le tri choisi reste retenu et revient dès qu'il
  // a de quoi trier ; le chevron, lui, montre le tri appliqué.
  const sort = useMemo(() => {
    if (data.length === 0) return chosen;
    const start = METRICS.findIndex((m) => m.key === chosen.key);
    for (let i = 0; i < METRICS.length; i++) {
      const key = METRICS[(start + i) % METRICS.length].key;
      if (data.some((r) => val(r, key) > 0))
        return key === chosen.key ? chosen : { key, dir: firstDir(key) };
    }
    return chosen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.key, chosen.dir, data]);

  // Changement de classement, de période OU de tri : seules les LIGNES
  // s'effacent (vers le fond, blanc ou sombre selon le thème) — en-tête,
  // cadre et barre de défilement restent en place —, puis la nouvelle vue
  // apparaît en cascade dès que ses données sont là. Pendant l'effacement, on
  // garde à l'écran les lignes quittées (instantané). Un refetch (temps réel)
  // ne change pas de vue : pas de fondu.
  const viewKey = `${kind}|${period}|${sort.key}|${sort.dir}`;
  const [shownView, setShownView] = useState(viewKey);
  const settled = shownView === viewKey;
  const [fadedOut, setFadedOut] = useState(false);
  // Données de la vue demandée arrivées (pas celles d'une autre période).
  const ready = active.data !== undefined && !isPlaceholderData;
  // Monogramme de chargement au premier affichage seulement : ensuite, la
  // table quittée reste affichée le temps du chargement.
  const waiting = useScreenLoader(settled && active.data === undefined && !error);
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
    else if (fadedOut && ready) {
      setShownView(viewKey);
      setFadedOut(false);
    }
  }, [settled, fadedOut, ready, viewKey]);

  // Colonnes vides sur la période (que des 0) : rien à y trier.
  const emptyCols = useMemo(
    () =>
      new Set<ColKey>(
        data.length
          ? METRICS.filter((m) => data.every((r) => val(r, m.key) === 0)).map(
              (m) => m.key,
            )
          : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  // Ordre de base par nom : il départage les ex æquo (tri stable).
  const byName = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [data],
  );

  const needle = fold(search.trim());
  // Égalités sur la colonne triée : soi-même d'abord, puis le total des
  // compteurs, puis les autres colonnes chiffrées de gauche à
  // droite, toujours dans le sens du tri ; enfin par nom (ordre de base).
  type TieKey = Metric | "total" | "me";
  const tieKeys: TieKey[] = [
    "me",
    "total",
    ...METRICS.map((m) => m.key).filter((k) => k !== sort.key),
  ];
  // Tri sur la liste entière, recherche ensuite : le rang reste celui du
  // classement complet.
  const sorted = sortRows<Row, TieKey>(
    byName,
    sort,
    (r, key) =>
      key === "me"
        ? // Signé selon le sens du tri : soi-même en tête dans les deux.
          Number(r.me) * (sort.dir === "asc" ? -1 : 1)
        : key === "total"
          ? METRICS.reduce((sum, m) => sum + val(r, m.key), 0)
          : val(r, key),
    tieKeys,
  );
  // Rang : seule la colonne triée compte, les ex æquo le partagent (1, 1, 3) ;
  // les autres départages ne fixent que l'ordre d'affichage.
  const ranks: number[] = [];
  const liveRows = sorted
    .map((r, i) => {
      const prev = sorted[i - 1];
      ranks[i] =
        prev && val(prev, sort.key) === val(r, sort.key) ? ranks[i - 1] : i + 1;
      return { ...r, rank: ranks[i] };
    })
    .filter(
      // Nom ou libellé mobile (trigramme d'un collègue).
      (r) =>
        !needle ||
        r.id === RICK_ROW.user_id ||
        fold(r.name).includes(needle) ||
        fold(r.short).includes(needle),
    );
  // Instantané de ce qui est affiché, rejoué pendant l'effacement (avec ses
  // colonnes : celles des collègues ou des restaurants).
  const snapshot = useRef({
    rows: liveRows,
    sortKey: sort.key as ColKey,
    kind,
  });
  if (settled) snapshot.current = { rows: liveRows, sortKey: sort.key, kind };
  const { rows, sortKey, kind: shownKind } = snapshot.current;
  const columns = COLUMNS[shownKind];
  const shownMetrics = metricsOf(shownKind);

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      {waiting ? null : error ? (
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
              // Zone du rang (--lb-rank-w) : du bord gauche à l'avatar, rang
              // centré dedans ; plus étroite sur mobile, où il se colle au bord.
              className="admin-table w-full border-separate border-spacing-0 text-center text-sm [--lb-rank-w:2rem] sm:[--lb-rank-w:3rem]"
              style={{ ["--admin-min-w" as string]: "560px" }}
            >
              {/* Colonnes chiffrées de même largeur : sans ça, chacune prend
                  la largeur de son intitulé et les écarts varient. */}
              <colgroup>
                <col />
                {shownMetrics.map((m) => (
                  <col
                    key={m.key}
                    style={{ width: `${68 / shownMetrics.length}%` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "sticky top-0 z-10 bg-muted px-2 py-3 last:pr-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        // Intitulé : au bord, sur les rangs, sur mobile ;
                        // aligné sur l'avatar, après la zone du rang, sur
                        // desktop (« ! » : prime sur la marge de `.admin-table`).
                        c.key === "name" && "pl-2! text-left sm:pl-[var(--lb-rank-w)]!",
                      )}
                    >
                      {c.key === "name" ? (
                        // Pas triable : simple intitulé.
                        c.label
                      ) : (
                        <SortHeader
                          label={c.label}
                          icon={c.icon}
                          dir={sort.key === c.key ? sort.dir : null}
                          idleDir={firstDir(c.key)}
                          disabled={emptyCols.has(c.key)}
                          onClick={() => toggle(c.key as Metric, sort)}
                        />
                      )}
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
                      colSpan={columns.length}
                      className="px-4 py-6 text-foreground/50"
                    >
                      <span className="lb-cell">
                        {shownKind === "users"
                          ? "Aucun collègue trouvé."
                          : "Aucun restaurant trouvé."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    // Rien sur la période (les favoris, pas datés, ne
                    // comptent pas) : ligne légèrement grisée.
                    const idle = shownMetrics.every(
                      (m) => m.key === "favorites" || val(r, m.key) === 0,
                    );
                    const resto = r.restaurant;
                    return (
                      <tr
                        key={r.id}
                        // Apparition en cascade, ligne après ligne (comme les
                        // tuiles des restos) ; l'effacement, lui, est d'un
                        // bloc. Plafonné : au-delà, les lignes sont hors écran.
                        style={
                          {
                            "--lb-d": `${Math.min(i, STAGGER_MAX) * STAGGER_MS}ms`,
                          } as React.CSSProperties
                        }
                        onClick={() => navigate(r.path)}
                        // Fiche resto : avis, photos, menus chargés dès
                        // l'intention de clic.
                        onMouseEnter={
                          resto ? () => prefetchRestaurant(resto.id) : undefined
                        }
                        aria-label={
                          resto
                            ? `Voir la fiche de ${r.name}`
                            : `Voir le profil de ${r.name}`
                        }
                        className={cn(
                          "cursor-pointer transition [&>td]:border-t [&>td]:border-border/60",
                          // Ma ligne : teinte portée par `.lb-me`, qui suit le
                          // fondu (sinon on la voyait sauter de place).
                          r.me
                            ? "lb-me"
                            : "[&>td]:bg-card hover:[&>td]:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]",
                        )}
                      >
                        {/* Pas de colonne figée (sticky + z-index) : chaque cellule
                            aurait formé son propre calque, et la ligne
                            suivante, peinte par-dessus, coupait l'aura et les
                            étincelles de la série. Cellules non positionnées :
                            l'avatar passe au-dessus de tous les fonds. La
                            table tient sans défiler en largeur (symboles et
                            trigrammes sur mobile). */}
                        <td className="py-1.5 pl-0! pr-2 text-left">
                          <span className="lb-cell flex items-center gap-2">
                            {/* Rang centré entre le bord et l'avatar (l'écart
                                du flex est repris par la marge négative). */}
                            <span className="-mr-2 w-[var(--lb-rank-w)] shrink-0 text-center tabular-nums text-foreground/50">
                              {r.rank}
                            </span>
                            {/* Opacité sur un enfant : celle de `.lb-cell`
                                porte le fondu, on ne la remplace pas. */}
                            <span
                              className={cn("block shrink-0", idle && "opacity-50")}
                            >
                              {resto ? (
                                <img
                                  loading="lazy"
                                  data-fade
                                  {...resizedImgProps(
                                    resto.image || noImage,
                                    IMG_THUMB,
                                  )}
                                  alt=""
                                  className={cn(
                                    "block h-7 w-7 rounded-md object-cover",
                                    resto.closed && "grayscale",
                                  )}
                                />
                              ) : (
                                r.user && (
                                  <StreakAvatar
                                    email={r.user.email}
                                    avatarPath={r.user.avatar_path}
                                    streak={r.user.streak}
                                    size={28}
                                    compact
                                  />
                                )
                              )}
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap",
                                // Nom d'un resto : coupé s'il est trop long.
                                resto &&
                                  "min-w-0 max-w-[7.5rem] truncate sm:max-w-[18rem]",
                                r.me
                                  ? "font-semibold text-foreground"
                                  : idle
                                    ? "text-foreground/45"
                                    : "text-foreground/90",
                              )}
                            >
                              {resto ? (
                                r.name
                              ) : (
                                <>
                                  {/* Mobile : le trigramme, plus court. */}
                                  <span className="sm:hidden">{r.short}</span>
                                  <span className="hidden sm:inline">{r.name}</span>
                                </>
                              )}
                            </span>
                          </span>
                        </td>
                        {shownMetrics.map((m) => {
                          const v = val(r, m.key);
                          return (
                            <td
                              key={m.key}
                              className={cn(
                                "px-2 py-1.5 last:pr-4 tabular-nums",
                                v === 0
                                  ? "text-foreground/30"
                                  : m.key === sortKey
                                    ? "font-semibold text-foreground"
                                    : "text-foreground/80",
                              )}
                            >
                              <span className="lb-cell">
                                {v === 0 ? "-" : v}
                              </span>
                            </td>
                          );
                        })}
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

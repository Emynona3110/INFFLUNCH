import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiChevronDown, FiX } from "react-icons/fi";
import { BsSearch } from "react-icons/bs";
import SearchInput from "./SearchInput";
import RollingNumber from "./RollingNumber";
import { addMonths, parisMonthKey } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

interface Props {
  /** Mois affiché « AAAA-MM » (retenu même quand « Depuis toujours » est actif). */
  month: string;
  onMonthChange: (month: string) => void;
  /** « Depuis toujours » actif. */
  all: boolean;
  onAllChange: (all: boolean) => void;
  /** Premier mois ayant du contenu : borne basse du sélecteur. */
  firstMonth: string | null;
  search: string;
  onSearch: (input: string) => void;
}

/** Rang d'un mois « AAAA-MM » : donne le sens du défilement. */
const monthIndex = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + m;
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const toDate = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
};
/** « Octobre 2026 ». */
const longLabel = (key: string) =>
  capitalize(
    toDate(key).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  );
/** « Oct. 26 » (mobile). */
const shortLabel = (key: string) =>
  capitalize(
    toDate(key).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })
  ) + ` ${key.slice(2, 4)}`;

/**
 * Barre d'outils de la page Classement, rendue comme celle des Restaurants
 * dans le bandeau sous la navbar : recherche de collègue (validée à Entrée ou
 * à la loupe, repliée en loupe sur mobile) et choix de la période.
 *
 * Période : un toggle à deux segments, comme le choix d'affichage des restos,
 * dont la pastille active GLISSE d'un segment à l'autre. Un clic
 * sur le mois ouvre la liste de tous les mois, du mois en cours au premier
 * ayant du contenu, au style de la liste de tri des restos.
 */
const LeaderboardToolbar = ({
  month,
  onMonthChange,
  all,
  onAllChange,
  firstMonth,
  search,
  onSearch,
}: Props) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const current = parisMonthKey();
  const first = firstMonth && firstMonth < current ? firstMonth : current;
  const months: string[] = [];
  for (let m = current; m >= first; m = addMonths(m, -1)) months.push(m);

  // Clic ailleurs ou Échap : la liste se referme.
  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setListOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [listOpen]);

  // Choisir un mois quitte « Depuis toujours ».
  const pickMonth = (m: string) => {
    onMonthChange(m);
    onAllChange(false);
    setListOpen(false);
  };

  // Pastille de l'option active : UN élément, derrière les deux segments
  // (les libellés restent toujours devant), placé sur le segment actif et
  // déplacé par transition CSS. Pas de layoutId framer-motion : sa projection
  // de mise en page décrochait la pastille pendant la descente du bandeau.
  const allRef = useRef<HTMLButtonElement>(null);
  const [pillBox, setPillBox] = useState<{ x: number; w: number } | null>(null);
  // Transition seulement après le premier placement : pas de glissement
  // depuis la gauche à l'affichage.
  const [pillReady, setPillReady] = useState(false);
  useLayoutEffect(() => {
    const place = () => {
      // Segment du mois : son conteneur (positionné, porte la liste) — c'est
      // lui qui est placé dans le toggle, le bouton y est à 0.
      const el = all ? allRef.current : listRef.current;
      if (el) setPillBox({ x: el.offsetLeft, w: el.offsetWidth });
    };
    place();
    // Libellés courts/longs selon la largeur d'écran : on replace au resize.
    const ro = new ResizeObserver(place);
    if (listRef.current) ro.observe(listRef.current);
    if (allRef.current) ro.observe(allRef.current);
    return () => ro.disconnect();
  }, [all, month]);
  useEffect(() => {
    if (pillBox && !pillReady) {
      const id = requestAnimationFrame(() => setPillReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [pillBox, pillReady]);

  return (
    <div className="flex w-full select-none items-center gap-1 sm:gap-2">
      {/* Mobile, recherche dépliée : champ pleine largeur + fermeture. */}
      {searchOpen && (
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:hidden">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search}
              autoFocus
              placeholder="Chercher un collègue..."
              onSearch={(input) => {
                onSearch(input);
                setSearchOpen(false);
              }}
            />
          </div>
          <button
            type="button"
            aria-label="Fermer la recherche"
            onClick={() => setSearchOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Mobile, recherche repliée : une loupe (point si une recherche est active). */}
      {!searchOpen && (
        <button
          type="button"
          aria-label="Rechercher"
          onClick={() => setSearchOpen(true)}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 sm:hidden"
        >
          <BsSearch className="h-[18px] w-[18px]" />
          {search && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      )}

      {/* Desktop : barre de recherche complète. */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <SearchInput
          value={search}
          onSearch={onSearch}
          placeholder="Chercher un collègue..."
        />
      </div>

      {/* Période. Cachée sur mobile pendant la saisie. */}
      <div
        className={cn(
          "relative ml-auto items-center gap-0.5 rounded-full bg-muted p-0.5",
          searchOpen ? "hidden sm:flex" : "flex",
        )}
      >
        {pillBox && (
          <span
            aria-hidden
            className={cn(
              "absolute bottom-0.5 left-0 top-0.5 rounded-full bg-card shadow-sm",
              pillReady &&
                "transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            )}
            style={{ width: pillBox.w, transform: `translateX(${pillBox.x}px)` }}
          />
        )}
        <div ref={listRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={listOpen}
            onClick={() => (all ? pickMonth(month) : setListOpen((o) => !o))}
            className={cn(
              "relative flex h-8 cursor-pointer items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors",
              all ? "text-foreground/55 hover:text-foreground" : "text-primary",
            )}
          >
            <span className="relative flex items-center gap-1">
              {/* Largeur fixe : celle du libellé le plus long (sizer
                  invisible empilé dans la même case), pour que changer de
                  mois ne retaille pas la recherche à côté. */}
              <span className="grid justify-items-center">
                <span className="invisible [grid-area:1/1]" aria-hidden>
                  <span className="hidden sm:inline">Septembre 0000</span>
                  <span className="sm:hidden">Sept. 00</span>
                </span>
                {/* Le mois défile comme le compteur d'inscrits, dans le sens
                    de la liste (plus récent en haut) : vers un mois plus
                    ancien, le texte monte ; vers un plus récent, il descend.
                    Pleine largeur de la case (celle du sizer) : la fenêtre
                    qui rogne le défilé ne doit pas couper un mois long qui
                    sort (Septembre) parce que l'entrant est plus court. */}
                <RollingNumber
                  value={-monthIndex(month)}
                  className="w-full justify-center [grid-area:1/1]"
                >
                  <span className="hidden sm:inline">{longLabel(month)}</span>
                  <span className="sm:hidden">{shortLabel(month)}</span>
                </RollingNumber>
              </span>
              <FiChevronDown className="h-3.5 w-3.5 opacity-60" />
            </span>
          </button>

          {listOpen && (
            <div
              role="listbox"
              aria-label="Mois"
              className="absolute right-0 top-full z-20 mt-1 max-h-64 min-w-full overflow-y-auto rounded-card border border-border bg-card shadow-xl"
            >
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={m === month}
                  onClick={() => pickMonth(m)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-center whitespace-nowrap px-3 py-1.5 text-center text-sm transition hover:bg-primary/10 hover:text-primary",
                    // Mois affiché : en couleur, sans coche.
                    m === month
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-card-foreground",
                  )}
                >
                  <span className="hidden sm:inline">{longLabel(m)}</span>
                  <span className="sm:hidden">{shortLabel(m)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          ref={allRef}
          type="button"
          aria-pressed={all}
          onClick={() => {
            onAllChange(true);
            setListOpen(false);
          }}
          className={cn(
            "relative flex h-8 cursor-pointer items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors",
            all ? "text-primary" : "text-foreground/55 hover:text-foreground",
          )}
        >
          <span className="relative hidden sm:inline">Depuis toujours</span>
          <span className="relative sm:hidden">Toujours</span>
        </button>
      </div>
    </div>
  );
};

export default LeaderboardToolbar;

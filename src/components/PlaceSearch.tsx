import { useEffect, useRef, useState } from "react";
import { FiCheck, FiMapPin, FiSearch, FiX } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import useTags from "@/hooks/useTags";
import { Place, searchPlaces } from "@/services/geocode";
import { slugify } from "@/utils/slugify";

/**
 * Valeurs OSM (`cuisine`, ou type de commerce) → tags INFFLUNCH candidats. Seuls
 * ceux qui existent réellement en base sont retenus : on ne crée rien ici.
 */
const OSM_TAGS: Record<string, string[]> = {
  french: ["Français"],
  italian: ["Italien"],
  pizza: ["Pizza", "Italien"],
  japanese: ["Japonais"],
  sushi: ["Sushi", "Japonais"],
  ramen: ["Ramen", "Japonais"],
  chinese: ["Chinois"],
  vietnamese: ["Vietnamien"],
  thai: ["Thaïlandais"],
  korean: ["Coréen"],
  indian: ["Indien"],
  lebanese: ["Libanais"],
  turkish: ["Turc"],
  kebab: ["Kebab", "Turc"],
  greek: ["Grec"],
  portuguese: ["Portugais"],
  spanish: ["Espagnol"],
  mexican: ["Mexicain"],
  american: ["Américain"],
  burger: ["Burger"],
  sandwich: ["Sandwich"],
  salad: ["Salade"],
  crepe: ["Crêpe"],
  bagel: ["Bagel"],
  poke: ["Poke"],
  vegetarian: ["Végétarien"],
  vegan: ["Vegan"],
  bakery: ["Boulangerie"],
  pastry: ["Pâtisserie"],
  supermarket: ["Supermarché"],
  deli: ["Traiteur"],
  bistro: ["Bistrot"],
};

/** Téléphone OSM (« +33 1 43… ») au format affiché « 01 43 … ». */
export const formatOsmPhone = (value: string) =>
  value.replace(/\D/g, "").replace(/^33/, "0").slice(0, 10).replace(/(\d{2})(?=\d)/g, "$1 ");

interface Props {
  /** Lieu retenu (affiché à la place du champ), null sinon. */
  picked: Place | null;
  /** Lieu choisi, avec les tags existants qui correspondent à sa cuisine. */
  onPick: (place: Place, tags: string[]) => void;
  /** Croix du lieu retenu. */
  onClear: () => void;
  /** Change à chaque ouverture du formulaire : la recherche repart à zéro. */
  resetKey: unknown;
  /** Saisie de départ, cherchée d'emblée (3 caractères au moins). */
  initialQuery?: string;
  autoFocus?: boolean;
}

/**
 * Recherche d'un resto du quartier dans OpenStreetMap (Edge Function
 * `geocode`), partagée par la proposition d'un collaborateur et la création
 * admin. Lancée à la touche Entrée seulement (on ménage Nominatim) ; le
 * déroulant s'affiche PAR-DESSUS le formulaire, un clic ailleurs ou Échap le
 * ferme, revenir dans le champ le rouvre.
 */
const PlaceSearch = ({
  picked,
  onPick,
  onClear,
  resetKey,
  initialQuery = "",
  autoFocus = false,
}: Props) => {
  const { data: availableTags } = useTags();
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const requestId = useRef(0);
  const searchRef = useRef<HTMLDivElement>(null);

  // Clic hors de la recherche : le déroulant se replie.
  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [listOpen]);

  // Une réponse arrivée après une recherche plus récente est ignorée.
  const runSearch = async (raw: string) => {
    const text = raw.trim();
    if (text.length < 3) return;
    const id = ++requestId.current;
    setSearching(true);
    setListOpen(true);
    const found = await searchPlaces(text).catch(() => []);
    if (id !== requestId.current) return;
    setPlaces(found);
    setSearching(false);
  };

  // Nouvelle ouverture : recherche vierge, ou lancée d'emblée sur la saisie de
  // départ.
  useEffect(() => {
    requestId.current++;
    setSearch(initialQuery);
    setPlaces(null);
    setSearching(false);
    setListOpen(true);
    if (initialQuery.trim().length >= 3) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /** Tags existants correspondant à la cuisine / au type OSM du lieu. */
  const tagsFor = (place: Place) => {
    const known = new Map(
      (availableTags ?? []).map((t) => [slugify(t.label), t.label]),
    );
    const keys = [
      ...(place.cuisine ?? "").split(/[;,]/).map((c) => c.trim().toLowerCase()),
      place.type ?? "",
    ];
    const labels = keys
      .flatMap((k) => OSM_TAGS[k] ?? [])
      .map((l) => known.get(slugify(l)))
      .filter((l): l is string => !!l);
    return [...new Set(labels)].sort();
  };

  if (picked) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 pl-3 pr-1.5 text-sm">
        <FiCheck className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{picked.name}</span>
          {picked.address && <span className="text-foreground/60"> · {picked.address}</span>}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Choisir un autre lieu"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition hover:bg-muted [&>svg]:opacity-60"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground opacity-45" />
        <Input
          autoFocus={autoFocus}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Les résultats affichés ne correspondent plus à la saisie.
            requestId.current++;
            setPlaces(null);
            setSearching(false);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch(search);
            } else if (e.key === "Escape" && listOpen && places) {
              // Ferme le déroulant, pas la fenêtre.
              e.stopPropagation();
              setListOpen(false);
            }
          }}
          placeholder="Rechercher le resto dans le quartier (Entrée)"
          className="pl-9 pr-9"
        />
        {searching && (
          <span className="absolute inset-y-0 right-3 flex items-center text-foreground/45">
            <Spinner />
          </span>
        )}
      </div>
      {listOpen && places && !searching && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {places.length > 0 ? (
            <ul className="m-0 list-none p-0">
              {places.map((p) => (
                <li key={`${p.lat},${p.lng},${p.name}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaces(null);
                      onPick(p, tagsFor(p));
                    }}
                    className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
                  >
                    <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      {p.address && (
                        <span className="block truncate text-xs text-foreground/55">
                          {p.address}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 px-3 py-2.5 text-sm text-foreground/55">
              Rien trouvé dans le quartier : remplis les champs ci-dessous.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;

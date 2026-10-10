import { useEffect, useRef, useState } from "react";
import { FiCheck, FiMapPin, FiX, FiSearch } from "react-icons/fi";
import { toast } from "@/lib/toast";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import TagPicker from "@/components/TagPicker";
import useTags from "@/hooks/useTags";
import useRestaurantSuggestions, {
  RestaurantSuggestion,
  SuggestionDraft,
} from "@/hooks/useRestaurantSuggestions";
import supabaseClient from "@/services/supabaseClient";
import { Place, searchPlaces } from "@/services/geocode";
import { MAX_TEXT } from "@/services/textLimits";
import { slugify } from "@/utils/slugify";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Saisie de départ (la recherche restée sans résultat dans la liste). */
  initialName?: string;
  /** Proposition à corriger (en attente) ; absente = nouvelle proposition. */
  item?: RestaurantSuggestion | null;
}

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

const formatPhone = (value: string) =>
  value.replace(/\D/g, "").replace(/^33/, "0").slice(0, 10).replace(/(\d{2})(?=\d)/g, "$1 ");

/**
 * « Proposer un resto » : un collaborateur signale un resto qui manque. Une
 * recherche dans OpenStreetMap (quartier d'INFFLUX) préremplit adresse,
 * téléphone, site et tags en un clic ; tout reste modifiable, et la saisie à la
 * main reste possible si le lieu n'y figure pas. Un admin crée ensuite la fiche
 * à partir de la proposition. Sert aussi à corriger une proposition tant
 * qu'elle attend (`item`).
 */
const ProposeRestaurantDialog = ({
  isOpen,
  onClose,
  initialName = "",
  item = null,
}: Props) => {
  const { submit, edit } = useRestaurantSuggestions("mine", false);
  const { data: availableTags } = useTags();

  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Place | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(true);

  // Clic hors de la recherche : le déroulant se replie.
  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [listOpen]);

  // Formulaire vierge à chaque ouverture (la recherche reprenant la saisie
  // restée sans résultat dans la liste), ou rempli avec la proposition à
  // corriger.
  useEffect(() => {
    if (!isOpen) return;
    setSearch(item ? "" : initialName);
    setPlaces(null);
    setPicked(null);
    setListOpen(true);
    setName(item?.name ?? initialName);
    setAddress(item?.address ?? "");
    setPhone(item?.phone ?? "");
    setWebsite(item?.website ?? "");
    setTags(item?.tags ?? []);
    setComment(item?.comment ?? "");
    setCoords(
      item?.lat != null && item?.lng != null ? { lat: item.lat, lng: item.lng } : null,
    );
  }, [isOpen, initialName, item]);

  // Recherche lancée à la touche Entrée seulement (pas à chaque frappe : on
  // ménage Nominatim). Une réponse arrivée après une recherche plus récente
  // est ignorée.
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

  // Ouverture depuis une recherche infructueuse de la liste : on cherche
  // d'emblée ce nom-là, une seule fois.
  useEffect(() => {
    if (isOpen && !item && initialName.trim().length >= 3) runSearch(initialName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialName]);

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

  const pick = (place: Place) => {
    setPicked(place);
    setPlaces(null);
    setName(place.name);
    setAddress(place.address);
    setPhone(place.phone ? formatPhone(place.phone) : "");
    setWebsite(place.website ?? "");
    setTags(tagsFor(place));
    setCoords({ lat: place.lat, lng: place.lng });
  };

  // Retirer le lieu choisi vide aussi ce qu'il avait rempli (le commentaire,
  // écrit par l'utilisateur, reste).
  const unpick = () => {
    setPicked(null);
    setCoords(null);
    setName("");
    setAddress("");
    setPhone("");
    setWebsite("");
    setTags([]);
  };

  const draft = (): SuggestionDraft => ({
    name: name.trim(),
    address: address.trim(),
    phone: phone.trim() || null,
    website: website.trim() || null,
    tags: tags.length ? tags : null,
    comment: comment.trim() || null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  });

  // Correction sans aucun changement : rien à écrire.
  const unchanged =
    !!item &&
    (() => {
      const d = draft();
      return (
        d.name === item.name &&
        d.address === item.address &&
        d.phone === item.phone &&
        d.website === item.website &&
        JSON.stringify(d.tags ?? []) === JSON.stringify(item.tags ?? []) &&
        d.comment === item.comment &&
        d.lat === item.lat &&
        d.lng === item.lng
      );
    })();

  const send = async () => {
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    if (!cleanName || !cleanAddress) return;
    if (unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      // Doublon évident : la fiche existe déjà sous ce nom.
      const { data: existing } = await supabaseClient
        .from("restaurants")
        .select("id")
        .eq("slug", slugify(cleanName))
        .limit(1);
      if (existing && existing.length > 0) {
        toast({
          title: "Déjà sur INFFLUNCH",
          description: `« ${cleanName} » a déjà sa fiche : cherche-le dans la liste.`,
          status: "info",
          duration: 5000,
        });
        return;
      }
      if (item) await edit.mutateAsync({ id: item.id, draft: draft() });
      else await submit.mutateAsync(draft());
      toast({
        title: item ? "Proposition modifiée" : "Merci !",
        description: item
          ? undefined
          : "Ta proposition est arrivée, tu peux la suivre dans Mon compte.",
        status: "success",
        duration: 4000,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: item ? "Modification impossible" : "Envoi impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-2xl">
      <DialogTitle>{item ? "Modifier la proposition" : "Proposer un restaurant"}</DialogTitle>

      <div className="mt-4 space-y-4 sm:mt-5">
        {/* Recherche OSM : un clic remplit le formulaire. */}
        {picked ? (
          <div className="flex h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 pl-3 pr-1.5 text-sm">
            <FiCheck className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{picked.name}</span>
              {picked.address && (
                <span className="text-foreground/60"> · {picked.address}</span>
              )}
            </span>
            <button
              type="button"
              onClick={unpick}
              aria-label="Choisir un autre lieu"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition hover:bg-muted [&>svg]:opacity-60"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Le déroulant s'affiche PAR-DESSUS le formulaire ; un clic ailleurs
          // ou Échap le ferme, revenir dans le champ le rouvre.
          <div ref={searchRef} className="relative">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground opacity-45" />
              <Input
                autoFocus
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
                          onClick={() => pick(p)}
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
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nom *</span>
            <Input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Adresse *</span>
            <Input
              value={address}
              maxLength={200}
              onChange={(e) => {
                setAddress(e.target.value);
                // Adresse retouchée : la position OSM ne vaut plus, l'admin
                // géocodera la nouvelle adresse.
                setCoords(null);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Téléphone</span>
            <Input
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Site web</span>
            <Input
              value={website}
              maxLength={300}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">Tags</span>
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    aria-label={`Retirer ${t}`}
                    className="cursor-pointer text-primary/60 transition hover:text-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <TagPicker
            className="mt-2"
            selected={tags}
            onPick={(label) =>
              setTags((prev) => (prev.includes(label) ? prev : [...prev, label].sort()))
            }
            placeholder="Ajouter un tag"
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Commentaire</span>
          <textarea
            value={comment}
            maxLength={MAX_TEXT}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_TEXT))}
            className="h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <span className="text-right text-xs text-foreground/45">
            {comment.length}/{MAX_TEXT}
          </span>
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2 sm:mt-6">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          onClick={send}
          loading={busy}
          disabled={!name.trim() || !address.trim() || unchanged}
        >
          {item ? "Enregistrer" : "Envoyer"}
        </Button>
      </div>
    </Dialog>
  );
};

export default ProposeRestaurantDialog;

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TagPicker from "@/components/TagPicker";
import useRestaurantSuggestions, {
  RestaurantSuggestion,
  SuggestionDraft,
} from "@/hooks/useRestaurantSuggestions";
import supabaseClient from "@/services/supabaseClient";
import { Place } from "@/services/geocode";
import PlaceSearch, { formatOsmPhone as formatPhone } from "@/components/PlaceSearch";
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

  const [picked, setPicked] = useState<Place | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  // Formulaire vierge à chaque ouverture (la recherche reprenant la saisie
  // restée sans résultat dans la liste), ou rempli avec la proposition à
  // corriger.
  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
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

  const pick = (place: Place, placeTags: string[]) => {
    setPicked(place);
    setName(place.name);
    setAddress(place.address);
    setPhone(place.phone ? formatPhone(place.phone) : "");
    setWebsite(place.website ?? "");
    setTags(placeTags);
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
        <PlaceSearch
          picked={picked}
          onPick={pick}
          onClear={unpick}
          resetKey={`${isOpen}-${item?.id ?? ""}-${initialName}`}
          initialQuery={item ? "" : initialName}
          autoFocus
        />

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

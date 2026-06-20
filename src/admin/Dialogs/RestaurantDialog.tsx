import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../../services/supabaseClient";
import useTags from "../../hooks/useTags";
import { slugify } from "../../utils/slugify";
import useLocations from "../../hooks/useLocations";
import { Restaurant } from "../../hooks/useRestaurants";
import BadgesToggles from "../../components/BadgesToggles";
import ImageUploadField from "../../components/ImageUploadField";
import {
  checkImageResolution,
  COVER_MIN_LONG_EDGE,
  COVER_WARN_LONG_EDGE,
} from "../../utils/imageCompress";
import badgeMap from "../../services/badgeMap";
import {
  uploadImageToBucket,
  bucketPathFromPublicUrl,
  removeFromBucket,
} from "../../services/uploadImage";
import { FiChevronDown, FiPlus, FiCheck, FiX } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Met en forme un label de tag (1re lettre de chaque mot en majuscule). */
const formatTagLabel = (input: string) =>
  input
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();

interface RestaurantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<Restaurant>;
}

const RestaurantDialog = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: RestaurantDialogProps) => {

  const [name, setName] = useState("");
  // image = URL existante (en base) ; imageFile = nouveau fichier choisi (pas
  // encore uploadé) ; imagePreview = object URL local pour la prévisualisation.
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Suppression par appui long (2s) avec barre de progression dans le bouton.
  const HOLD_MS = 1000;
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: availableTags } = useTags();
  const { fetchLocation, loading: locationLoading } = useLocations();
  const queryClient = useQueryClient();

  const clearPreview = () =>
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  // Sélection d'un nouveau fichier : contrôle de résolution (le hero s'affiche
  // en grand → seuils stricts), puis prévisualisation locale et on oublie l'URL
  // existante (la source d'affichage devient le fichier).
  const pickImage = async (file: File) => {
    const { level, longEdge } = await checkImageResolution(file, {
      min: COVER_MIN_LONG_EDGE,
      warn: COVER_WARN_LONG_EDGE,
    }).catch(() => ({ level: "ok" as const, longEdge: 0 }));

    if (level === "block") {
      toast({
        title: "Image trop petite pour une couverture",
        description: `Minimum ${COVER_MIN_LONG_EDGE}px sur le grand côté (ici ${longEdge}px). Elle serait floue en grand.`,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      return;
    }
    if (level === "warn") {
      toast({
        title: "Qualité limite",
        description: `Image un peu juste (${longEdge}px) pour un affichage en grand.`,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
    }

    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImage("");
  };

  const clearImage = () => {
    setImageFile(null);
    clearPreview();
    setImage("");
  };

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || "");
      setImage(initialData.image || "");
      setImageFile(null);
      clearPreview();
      setAddress(initialData.address || "");
      setWebsite(initialData.website || "");
      setPhone(initialData.phone || "");
      setTags(initialData.tags || []);
      setBadges(initialData.badges || []);
    } else if (!isOpen) {
      setName("");
      setImage("");
      setImageFile(null);
      clearPreview();
      setAddress("");
      setWebsite("");
      setPhone("");
      setTags([]);
      setBadges([]);
      setCreatingTag(false);
      setNewTag("");
      cancelHold();
    }
  }, [isOpen, initialData]);

  // Nettoyage du timer si le composant est démonté pendant un appui.
  useEffect(() => () => cancelHold(), []);

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
  };

  const startHold = () => {
    if (isDeleting || holdTimer.current) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      handleDelete();
    }, HOLD_MS);
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsDeleting(true);
    const { error } = await supabaseClient
      .from("restaurants")
      .delete()
      .eq("id", initialData.id);
    setIsDeleting(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Restaurant supprimé",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    onSuccess?.();
    onClose();
  };

  const handleCreateTag = async () => {
    const formatted = formatTagLabel(newTag);
    if (!formatted) return;

    // Évite un doublon (insensible à la casse) déjà présent en base.
    const existing = (availableTags ?? []).find(
      (t) => t.label.toLowerCase() === formatted.toLowerCase()
    );
    if (existing) {
      if (!tags.includes(existing.label))
        setTags([...tags, existing.label].sort());
      setCreatingTag(false);
      setNewTag("");
      return;
    }

    setTagSubmitting(true);
    const { error } = await supabaseClient
      .from("tags")
      .insert({ label: formatted });
    setTagSubmitting(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Rafraîchit la liste des tags partout + sélectionne le nouveau.
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    setTags([...tags, formatted].sort());
    setCreatingTag(false);
    setNewTag("");
    toast({ title: "Tag créé", status: "success", duration: 2500, isClosable: true });
  };

  const formatName = (value: string) =>
    value
      .split(" ")
      .map((w) => {
        if (/^\p{L}'/u.test(w) && w.length > 2) {
          return (
            w.charAt(0).toUpperCase() +
            "'" +
            w.charAt(2).toUpperCase() +
            w.slice(3)
          );
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");

  const formatPhoneNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    return digitsOnly.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  };

  const isUnchanged = (existing: Partial<Restaurant>) => {
    return (
      existing.name === formatName(name) &&
      existing.image === (image || null) &&
      existing.address === address &&
      existing.website === (website || null) &&
      existing.phone === (phone || null) &&
      JSON.stringify(existing.tags?.sort()) === JSON.stringify(tags.sort()) &&
      JSON.stringify(existing.badges?.sort()) === JSON.stringify(badges.sort())
    );
  };

  const handleSubmit = async () => {
    const formattedName = formatName(name.trim());
    const slug = slugify(formattedName);
    const badgeOrder = Object.keys(badgeMap);
    const orderedBadges = badges.length
      ? badgeOrder.filter((label) => badges.includes(label))
      : null;

    setIsSubmitting(true);

    let location;
    try {
      location = await fetchLocation(address);
    } catch (err: any) {
      toast({
        title: "Erreur d'adresse",
        description: err.message || "Adresse invalide",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsSubmitting(false);
      return;
    }

    // Upload de la nouvelle image (si un fichier a été choisi) → URL publique.
    let finalImage: string | null = image || null;
    if (imageFile) {
      try {
        const res = await uploadImageToBucket(imageFile, "covers", {
          maxSize: 2000,
          quality: 0.9,
        });
        finalImage = res.url;
      } catch (err: any) {
        toast({
          title: "Échec de l'envoi de l'image",
          description: err.message || "Réessaie.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }
    }

    if (initialData?.id) {
      const { data: beforeUpdate } = await supabaseClient
        .from("restaurants")
        .select("*")
        .eq("id", initialData.id)
        .single();

      if (beforeUpdate && !imageFile && isUnchanged(beforeUpdate)) {
        toast({
          title: "Aucune modification",
          description: "Les champs sont identiques.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabaseClient
        .from("restaurants")
        .update({
          name: formattedName,
          slug,
          image: finalImage,
          address,
          website: website || null,
          phone: phone || null,
          distance: location.distanceKm,
          distanceLabel: location.formattedDistance,
          lat: location.coords.lat,
          lng: location.coords.lng,
          tags: tags.length ? tags : null,
          badges: orderedBadges,
        })
        .eq("id", initialData.id);

      setIsSubmitting(false);

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // L'ancienne couverture (si stockée dans notre bucket) est désormais
      // orpheline → on la supprime (best effort, ne bloque pas le succès).
      if (imageFile) {
        const oldPath = bucketPathFromPublicUrl(initialData.image);
        if (oldPath && oldPath !== bucketPathFromPublicUrl(finalImage)) {
          removeFromBucket(oldPath);
        }
      }

      toast({
        title: "Restaurant modifié",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onSuccess?.();
      onClose();
      return;
    }

    const { data: existing } = await supabaseClient
      .from("restaurants")
      .select("slug")
      .eq("slug", slug);

    if (existing && existing.length > 0) {
      toast({
        title: "Nom déjà utilisé",
        description: "Un restaurant avec ce nom existe déjà.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabaseClient.from("restaurants").insert({
      name: formattedName,
      slug,
      image: finalImage,
      address,
      website: website || null,
      phone: phone || null,
      distance: location.distanceKm,
      distanceLabel: location.formattedDistance,
      lat: location.coords.lat,
      lng: location.coords.lng,
      tags: tags.length ? tags : null,
      badges: orderedBadges,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Restaurant ajouté",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    onSuccess?.();
    onClose();
  };

  const tagOptions = (availableTags ?? [])
    .map((t) => t.label)
    .filter((o) => !tags.includes(o))
    .sort();

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-3xl">
      <DialogTitle>
        {initialData ? "Modifier un restaurant" : "Ajouter un restaurant"}
      </DialogTitle>

      <div className="mt-5 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nom</span>
            <Input
              value={name}
              onChange={(e) => setName(formatName(e.target.value))}
              placeholder="Nom du restaurant"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Adresse</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse"
            />
          </label>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Image</span>
            <ImageUploadField
              previewUrl={imagePreview ?? (image || null)}
              onPick={pickImage}
              onClear={clearImage}
              disabled={isSubmitting}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Site web</span>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Site web"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Téléphone</span>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="Téléphone"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Tags */}
          <div>
            <span className="text-sm font-bold text-foreground">Tags</span>
            <div className="mb-2 mt-1.5 flex flex-wrap gap-1.5">
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && !tags.includes(v)) setTags([...tags, v].sort());
                  }}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  <option value="">Choisir un tag</option>
                  {tagOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              </div>
              {!creatingTag && (
                <button
                  type="button"
                  aria-label="Créer un tag"
                  onClick={() => setCreatingTag(true)}
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-border text-foreground/70 transition hover:bg-muted hover:text-primary"
                >
                  <FiPlus className="h-5 w-5" />
                </button>
              )}
            </div>

            {creatingTag && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  autoFocus
                  value={newTag}
                  placeholder="Nouveau tag"
                  onChange={(e) => setNewTag(formatTagLabel(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    } else if (e.key === "Escape") {
                      setCreatingTag(false);
                      setNewTag("");
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Valider le tag"
                  onClick={handleCreateTag}
                  disabled={tagSubmitting || !newTag.trim()}
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  {tagSubmitting ? <Spinner /> : <FiCheck className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  aria-label="Annuler"
                  onClick={() => {
                    setCreatingTag(false);
                    setNewTag("");
                  }}
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-border text-foreground/70 transition hover:bg-muted"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Badges */}
          <div>
            <span className="text-sm font-bold text-foreground">Badges</span>
            <div className="mt-1.5">
              <BadgesToggles selected={badges} onChange={setBadges} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <div>
          {initialData?.id && (
            <button
              type="button"
              disabled={isDeleting}
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Maintenir pour supprimer"
              title="Maintenir pour supprimer"
              className="relative inline-flex h-10 cursor-pointer touch-none select-none items-center justify-center overflow-hidden rounded-lg bg-destructive px-4 text-sm font-medium text-white transition hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {/* Barre de progression de l'appui long */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-white/30 ease-linear"
                style={{
                  width: holding ? "100%" : "0%",
                  transitionProperty: "width",
                  transitionDuration: holding ? `${HOLD_MS}ms` : "150ms",
                }}
              />
              <span className="relative inline-flex items-center gap-2">
                {isDeleting && <Spinner />}
                {isDeleting ? "Suppression…" : "Supprimer"}
              </span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting || locationLoading}
            disabled={!name.trim() || !address.trim()}
          >
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default RestaurantDialog;

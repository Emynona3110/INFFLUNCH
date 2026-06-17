import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import supabaseClient from "../../services/supabaseClient";
import useTags from "../../hooks/useTags";
import { slugify } from "../../utils/slugify";
import useLocations from "../../hooks/useLocations";
import { Restaurant } from "../../hooks/useRestaurants";
import BadgesToggles from "../../components/BadgesToggles";
import badgeMap from "../../services/badgeMap";
import { FiChevronDown } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [image, setImage] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: availableTags } = useTags();
  const { fetchLocation, loading: locationLoading } = useLocations();

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || "");
      setImage(initialData.image || "");
      setAddress(initialData.address || "");
      setWebsite(initialData.website || "");
      setPhone(initialData.phone || "");
      setTags(initialData.tags || []);
      setBadges(initialData.badges || []);
    } else if (!isOpen) {
      setName("");
      setImage("");
      setAddress("");
      setWebsite("");
      setPhone("");
      setTags([]);
      setBadges([]);
    }
  }, [isOpen, initialData]);

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

    if (initialData?.id) {
      const { data: beforeUpdate } = await supabaseClient
        .from("restaurants")
        .select("*")
        .eq("id", initialData.id)
        .single();

      if (beforeUpdate && isUnchanged(beforeUpdate)) {
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
          image: image || null,
          address,
          website: website || null,
          phone: phone || null,
          distance: location.distanceKm,
          distanceLabel: location.formattedDistance,
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
      image: image || null,
      address,
      website: website || null,
      phone: phone || null,
      distance: location.distanceKm,
      distanceLabel: location.formattedDistance,
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
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Image (URL)</span>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="URL de l'image"
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Site web</span>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Site web"
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
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
            <div className="relative">
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

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || locationLoading || !name.trim() || !address.trim()}
        >
          {isSubmitting || locationLoading
            ? "…"
            : initialData
            ? "Modifier"
            : "Ajouter"}
        </Button>
      </div>
    </Dialog>
  );
};

export default RestaurantDialog;

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { FiMapPin, FiArrowRight, FiCheck, FiX } from "react-icons/fi";
import supabaseClient from "@/services/supabaseClient";
import { geocodeAddress, reverseGeocode } from "@/services/geocode";
import { distanceKmFromInfflux, formatDistance } from "@/services/distance";
import { fetchWalkMinutes, estimateWalkMinutes } from "@/services/walkTime";
import LocationPicker from "@/components/LocationPicker";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Dialog dédié à la correction de la position d'un restaurant (admin) : ouvert
 * par le crayon de la section « Carte » de la fiche. Permet de re-géocoder
 * l'adresse, de déplacer l'épingle ou de saisir des coordonnées. Quand on bouge
 * le point, on géocode en INVERSE et on propose d'appliquer l'adresse détectée
 * (les adresses saisies depuis Google peuvent être approximatives). À
 * l'enregistrement : recalcule distance + temps de marche.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id: number;
    address: string;
    lat: number | null;
    lng: number | null;
  };
  onSuccess?: () => void;
}

// Normalisation pour comparaison (ignore casse, virgules, espaces multiples).
const norm = (s: string) =>
  s.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();

export default function LocationEditDialog({
  isOpen,
  onClose,
  restaurant,
  onSuccess,
}: Props) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  // Géocodage inverse seulement après une interaction (pas au chargement).
  const movedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setLat(restaurant.lat ?? null);
      setLng(restaurant.lng ?? null);
      setAddress(restaurant.address ?? "");
      setDetected(null);
      movedRef.current = false;
    }
  }, [isOpen, restaurant.lat, restaurant.lng, restaurant.address]);

  // Déplacement du pin → géocodage inverse (debounce) pour proposer l'adresse.
  useEffect(() => {
    if (!movedRef.current || lat == null || lng == null) return;
    const t = setTimeout(async () => {
      try {
        setDetected(await reverseGeocode(lat, lng));
      } catch {
        setDetected(null);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [lat, lng]);

  // L'épingle a bougé (drag / clic / saisie lat-lng).
  const handlePick = (c: { lat: number; lng: number }) => {
    movedRef.current = true;
    setLat(c.lat);
    setLng(c.lng);
  };

  // Géocodage direct depuis l'adresse courante (move programmé → pas de reverse).
  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const c = await geocodeAddress(address.trim());
      movedRef.current = false;
      setDetected(null);
      setLat(c.lat);
      setLng(c.lng);
    } catch {
      toast({
        title: "Adresse introuvable",
        description: "Place le restaurant manuellement sur la carte.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setGeocoding(false);
    }
  };

  // On ne propose l'adresse détectée que si elle apporte vraiment autre chose :
  // pas si l'adresse actuelle la contient déjà (ex. reverse qui perd le numéro
  // → « Rue de Fontenay… » alors qu'on a « 184 Rue de Fontenay… »).
  const showApply =
    !!detected &&
    detected.trim() !== "" &&
    norm(detected) !== norm(address) &&
    !norm(address).includes(norm(detected));

  const handleSave = async () => {
    if (lat == null || lng == null) return;
    setSaving(true);

    const distanceKm = distanceKmFromInfflux({ lat, lng });
    const distanceLabel = formatDistance(distanceKm);
    let walkMinutes = await fetchWalkMinutes(lat, lng);
    if (walkMinutes == null) walkMinutes = estimateWalkMinutes(distanceKm);

    const { error } = await supabaseClient
      .from("restaurants")
      .update({
        address,
        lat,
        lng,
        distance: distanceKm,
        distanceLabel,
        walk_minutes: walkMinutes,
      })
      .eq("id", restaurant.id);

    setSaving(false);

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

    queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    toast({
      title: "Position mise à jour",
      status: "success",
      duration: 2500,
      isClosable: true,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="flex h-[calc(100vh-2rem)] max-w-none flex-col"
    >
      <DialogTitle>Position du restaurant</DialogTitle>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-start gap-2">
          {/* Bouton « localiser depuis l'adresse » = pin seul, à gauche. */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGeocode}
            loading={geocoding}
            disabled={!address.trim()}
            aria-label="Localiser depuis l'adresse"
            title="Localiser depuis l'adresse"
            className="shrink-0"
          >
            {!geocoding && <FiMapPin className="h-4 w-4" />}
          </Button>

          {showApply ? (
            // Barre de diff : ancienne adresse barrée → nouvelle, + ✓ / ✕.
            // min-h-10 = même hauteur que l'Input (pas de saut). flex-wrap →
            // s'empile en mobile.
            <div className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="text-foreground/50 line-through">{address || "—"}</span>
                <FiArrowRight className="h-4 w-4 shrink-0 text-foreground opacity-40" />
                <span className="break-words font-medium text-primary">{detected}</span>
                {!/^\d/.test((detected ?? "").trim()) && (
                  <span className="text-xs text-foreground/50">(n° à compléter)</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Appliquer l'adresse détectée"
                  onClick={() => {
                    setAddress(detected as string);
                    setDetected(null);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                >
                  <FiCheck className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ignorer la suggestion"
                  onClick={() => setDetected(null)}
                  className="grid h-7 w-7 place-items-center rounded-full text-foreground/50 transition hover:bg-muted hover:text-foreground"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="N° rue, code postal ville"
              className="flex-1"
            />
          )}
        </div>

        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={handlePick}
          className="min-h-0 flex-1"
        />
      </div>

      <div className="mt-4 flex shrink-0 justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={lat == null || lng == null}>
          Enregistrer
        </Button>
      </div>
    </Dialog>
  );
}

import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Input,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  useColorModeValue,
  useToast,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import supabaseClient from "../../services/supabaseClient";
import useTags from "../../hooks/useTags";
import useBadges from "../../hooks/useBadges";
import { slugify } from "../../utils/slugify";
import useLocations from "../../hooks/useLocations";
import { Restaurant } from "../../hooks/useRestaurants";

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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: availableTags } = useTags();
  const { data: availableBadges } = useBadges();
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
          badges: badges.length ? badges : null,
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
      badges: badges.length ? badges : null,
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

  const renderSelectable = (
    label: string,
    items: string[],
    setItems: (items: string[]) => void,
    available: string[],
    placeholder: string
  ) => (
    <FormControl>
      <FormLabel fontWeight="bold">{label}</FormLabel>
      <Wrap mb={2}>
        {items.map((item) => (
          <WrapItem key={item}>
            <Tag>
              <TagLabel>{item}</TagLabel>
              <TagCloseButton
                onClick={() => setItems(items.filter((t) => t !== item))}
              />
            </Tag>
          </WrapItem>
        ))}
      </Wrap>
      <Select
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.target.value;
          if (value && !items.includes(value)) {
            setItems([...items, value].sort());
          }
        }}
        value=""
      >
        {available
          .filter((opt) => !items.includes(opt))
          .sort()
          .map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
      </Select>
    </FormControl>
  );

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay />
      <AlertDialogContent
        bg={useColorModeValue("white", "gray.900")}
        maxW={{ base: "100%", md: "4xl" }}
        mx={{ base: 4, md: "auto" }}
      >
        <AlertDialogHeader>
          {initialData ? "Modifier un restaurant" : "Ajouter un restaurant"}
        </AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <VStack spacing={6} align="stretch">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(formatName(e.target.value))}
                    placeholder="Nom du restaurant"
                  />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Adresse</FormLabel>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Adresse"
                  />
                </FormControl>
              </GridItem>
              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel>Image (URL)</FormLabel>
                  <Input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="URL de l'image"
                  />
                </FormControl>
              </GridItem>
              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel>Site web</FormLabel>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Site web"
                  />
                </FormControl>
              </GridItem>
              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input
                    value={phone}
                    onChange={(e) =>
                      setPhone(formatPhoneNumber(e.target.value))
                    }
                    placeholder="Téléphone"
                  />
                </FormControl>
              </GridItem>
            </Grid>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {renderSelectable(
                "Tags",
                tags,
                setTags,
                availableTags?.map((t) => t.label) ?? [],
                "Choisir un tag"
              )}
              {renderSelectable(
                "Badges",
                badges,
                setBadges,
                availableBadges?.map((b) => b.label) ?? [],
                "Choisir un badge"
              )}
            </Grid>
          </VStack>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            ml={3}
            onClick={handleSubmit}
            isLoading={isSubmitting || locationLoading}
            isDisabled={!name.trim() || !address.trim()}
          >
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RestaurantDialog;

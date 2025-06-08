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
import useLocations from "../../hooks/useLocations";
import { slugify } from "../../utils/slugify";

interface RestaurantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RestaurantDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: RestaurantDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const { data: availableTags } = useTags();
  const { data: availableBadges } = useBadges();
  const {
    data: locationData,
    loading: locationLoading,
    error: locationError,
  } = useLocations(address);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setImage("");
      setAddress("");
      setEmail("");
      setPhone("");
      setTags([]);
      setBadges([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!locationData) {
      toast({
        title: "Adresse invalide",
        description: locationError || "Impossible de calculer la distance",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    const formattedName = capitalize(name.trim());
    const slug = slugify(formattedName);

    // Vérifier si le restaurant existe déjà
    const { data: existing } = await supabaseClient
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      toast({
        title: "Restaurant existant",
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
      email: email || null,
      phone: phone || null,
      distance: locationData.distanceKm,
      distanceLabel: locationData.formattedDistance,
      tags: tags.length === 0 ? null : tags,
      badges: badges.length === 0 ? null : badges,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Erreur lors de l'ajout",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Restaurant ajouté",
      description: `"${formattedName}" a été ajouté avec succès.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const renderSelectable = (
    label: string,
    items: string[],
    setItems: (val: string[]) => void,
    available: string[],
    placeholder: string
  ) => (
    <FormControl>
      <FormLabel fontWeight="bold">{label}</FormLabel>
      <Wrap mb={2}>
        {items.length > 0 ? (
          items.map((val) => (
            <WrapItem key={val}>
              <Tag colorScheme="blue" borderRadius="full">
                <TagLabel>{val}</TagLabel>
                <TagCloseButton
                  onClick={() => setItems(items.filter((t) => t !== val))}
                />
              </Tag>
            </WrapItem>
          ))
        ) : (
          <WrapItem>
            <Tag colorScheme="gray" variant="subtle">
              Aucun {label.toLowerCase()}
            </Tag>
          </WrapItem>
        )}
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
          .filter((t) => !items.includes(t))
          .sort()
          .map((t) => (
            <option key={t} value={t}>
              {t}
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
        <AlertDialogHeader>Ajouter un restaurant</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <VStack spacing={6} align="stretch">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <GridItem>
                <FormControl>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(capitalize(e.target.value))}
                    placeholder="Nouveau Restaurant"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Adresse</FormLabel>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Adresse du restaurant"
                  />
                </FormControl>
              </GridItem>
              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel>Image (URL)</FormLabel>
                  <Input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Lien vers l'image"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresse email"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Numéro de téléphone"
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
            Ajouter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RestaurantDialog;

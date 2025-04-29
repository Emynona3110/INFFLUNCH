import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useDisclosure,
  Select,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  useColorModeValue,
  IconButton,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
  HStack,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { BsFilter } from "react-icons/bs";
import { RestaurantQuery } from "../App";
import { SortOrder } from "./SortSelector";
import StarRating from "./StarRating";

interface FilterDialogProps {
  restaurantQuery: RestaurantQuery;
  onFilterChange: (query: RestaurantQuery) => void;
}

const availableTags = [
  "Italien",
  "Végétarien",
  "Asiatique",
  "Burgers",
  "Français",
  "Pâtisserie",
];

const FilterDialog = ({
  restaurantQuery,
  onFilterChange,
}: FilterDialogProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [localQuery, setLocalQuery] =
    useState<RestaurantQuery>(restaurantQuery);
  const [newTag, setNewTag] = useState("");

  const handleOpen = () => {
    setLocalQuery(restaurantQuery); // reset aux derniers filtres si on réouvre
    onOpen();
  };

  const handleAddTag = () => {
    if (newTag && !localQuery.tags.includes(newTag)) {
      setLocalQuery({
        ...localQuery,
        tags: [...localQuery.tags, newTag].sort(),
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setLocalQuery({
      ...localQuery,
      tags: localQuery.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const selectableTags = availableTags
    .filter((tag) => !localQuery.tags.includes(tag))
    .sort();

  const handleValidate = () => {
    onFilterChange(localQuery);
    onClose();
  };

  return (
    <>
      <IconButton
        aria-label="Filtres"
        icon={<BsFilter size={24} />}
        onClick={handleOpen}
        variant="ghost"
      />

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        motionPreset="slideInBottom"
        isCentered
      >
        <AlertDialogOverlay />

        <AlertDialogContent bg={useColorModeValue("white", "gray.900")}>
          <AlertDialogHeader>Filtres</AlertDialogHeader>
          <AlertDialogCloseButton />

          <AlertDialogBody>
            <VStack spacing={4} align="stretch">
              {/* Tags */}
              <Wrap>
                {localQuery.tags.length > 0 ? (
                  localQuery.tags.map((tag) => (
                    <WrapItem key={tag}>
                      <Tag
                        variant="solid"
                        colorScheme="blue"
                        borderRadius="full"
                      >
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                      </Tag>
                    </WrapItem>
                  ))
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    Aucun tag sélectionné
                  </Text>
                )}
              </Wrap>

              <Select
                placeholder="Choisir un tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              >
                {selectableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>

              <Button onClick={handleAddTag} size="sm" isDisabled={!newTag}>
                Ajouter le tag
              </Button>

              {/* Note minimum */}
              <Text fontWeight="bold">Note minimum :</Text>
              <HStack>
                <NumberInput
                  value={localQuery.minRate}
                  onChange={(_, valueNumber) =>
                    setLocalQuery({ ...localQuery, minRate: valueNumber })
                  }
                  min={0}
                  max={5}
                  step={1}
                  precision={1}
                  w={"100%"}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>

                <StarRating rating={localQuery.minRate} size="24px" />
              </HStack>

              {/* Tri */}
              <Text fontWeight="bold">Trier par :</Text>
              <Select
                value={localQuery.sortOrder}
                onChange={(e) =>
                  setLocalQuery({
                    ...localQuery,
                    sortOrder: e.target.value as SortOrder,
                  })
                }
              >
                <option value="">Pertinence</option>
                <option value="highestRated">Meilleurs notes</option>
                <option value="nearest">Proximité</option>
                <option value="mostreviewed">Nombre d'avis</option>
                <option value="newest">Ajout Récent</option>
              </Select>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" ml={3} onClick={handleValidate}>
              Valider
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FilterDialog;

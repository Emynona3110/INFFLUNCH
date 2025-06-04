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
import { RestaurantFilters } from "../App";
import { SortOrder } from "./SortSelector";
import StarRating from "./StarRating";
import { motion, AnimatePresence } from "framer-motion";
import useTags from "../hooks/useTags";

interface FilterDialogProps {
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
}

const defaultFilters: RestaurantFilters = {
  sortOrder: "relevance",
  minRate: 0,
  tags: [],
  searchText: "",
};

const FilterDialog = ({
  restaurantFilters,
  onFilterChange,
}: FilterDialogProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [localQuery, setLocalQuery] =
    useState<RestaurantFilters>(restaurantFilters);

  const {
    data: availableTags,
    // loading: tagsLoading,
    // error: tagsError,
  } = useTags();

  const handleOpen = () => {
    setLocalQuery(restaurantFilters);
    onOpen();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setLocalQuery({
      ...localQuery,
      tags: localQuery.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleValidate = () => {
    onFilterChange(localQuery);
    onClose();
  };

  const selectableTags = availableTags
    .filter((tag) => !localQuery.tags.includes(tag.label))
    .sort();

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
                transition="all 0.2s ease-in-out"
              >
                <option value="relevance">Pertinence</option>
                <option value="rating">Meilleures notes</option>
                <option value="distance">Proximité</option>
                <option value="reviews">Nombre d'avis</option>
                <option value="created_at">Ajout récent</option>
              </Select>

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
                  w="100%"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <StarRating rating={localQuery.minRate} size="24px" />
              </HStack>

              {/* Tags */}
              <Text fontWeight="bold">Tags :</Text>
              <Wrap>
                <AnimatePresence initial={false}>
                  {localQuery.tags.length > 0 ? (
                    localQuery.tags.map((tag) => (
                      <motion.div
                        key={tag}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <WrapItem>
                          <Tag
                            variant="solid"
                            colorScheme="blue"
                            borderRadius="full"
                            cursor="default"
                          >
                            <TagLabel paddingY="5px">{tag}</TagLabel>
                            <TagCloseButton
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Tag>
                        </WrapItem>
                      </motion.div>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      Aucun tag sélectionné
                    </Text>
                  )}
                </AnimatePresence>
              </Wrap>

              {/* Selecteur de tags */}
              <Select
                key={localQuery.tags.join(",")}
                value=""
                onChange={(e) => {
                  const selectedTag = e.target.value;
                  if (selectedTag && !localQuery.tags.includes(selectedTag)) {
                    setLocalQuery((prev) => ({
                      ...prev,
                      tags: [...prev.tags, selectedTag].sort(),
                    }));
                  }
                }}
                transition="all 0.2s ease-in-out"
              >
                <option value="" disabled hidden>
                  Choisir un tag
                </option>
                {selectableTags.map((tag) => (
                  <option key={tag.id} value={tag.label}>
                    {tag.label}
                  </option>
                ))}
              </Select>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter justifyContent="space-between">
            <Button
              variant="ghost"
              onClick={() => setLocalQuery(defaultFilters)}
            >
              Réinitialiser
            </Button>

            <HStack>
              <Button ref={cancelRef} onClick={onClose}>
                Annuler
              </Button>
              <Button colorScheme="blue" onClick={handleValidate}>
                Valider
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FilterDialog;

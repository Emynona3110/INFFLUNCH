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
  Box,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { BsFilter } from "react-icons/bs";
import { SortOrder } from "./SortSelector";
import StarRating from "./StarRating";
import { motion, AnimatePresence } from "framer-motion";
import useTags from "../hooks/useTags";
import { defaultRestaurantFilters, RestaurantFilters } from "../pages/UserPage";
import BadgesToggles from "./BadgesToggles";

interface FilterDialogProps {
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
}

const hasActiveFilters = (filters: RestaurantFilters) => {
  return (
    filters.minRate > 0 ||
    filters.tags.length > 0 ||
    filters.badges.length > 0 ||
    filters.sortOrder !== defaultRestaurantFilters.sortOrder ||
    filters.favoritesOnly === true
  );
};

const FilterDialog = ({
  restaurantFilters,
  onFilterChange,
}: FilterDialogProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [localQuery, setLocalQuery] =
    useState<RestaurantFilters>(restaurantFilters);

  const { data: availableTags } = useTags();

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
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <Box position="relative">
        <IconButton
          aria-label="Filtres"
          icon={<BsFilter size={24} />}
          onClick={handleOpen}
          variant="ghost"
        />
        <AnimatePresence>
          {hasActiveFilters(restaurantFilters) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#4299e1",
              }}
            />
          )}
        </AnimatePresence>
      </Box>

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
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="favorites-switch" mb="0" fontWeight="bold">
                  Mes favoris
                </FormLabel>
                <Switch
                  id="favorites-switch"
                  isChecked={!!localQuery.favoritesOnly}
                  onChange={(e) =>
                    setLocalQuery((prev) => ({
                      ...prev,
                      favoritesOnly: e.target.checked,
                    }))
                  }
                  colorScheme="blue"
                />
              </FormControl>

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
                <option value="relevance">Pertinence</option>
                <option value="rating">Meilleures notes</option>
                <option value="distance">Proximité</option>
                <option value="reviews">Nombre d'avis</option>
                <option value="created_at">Ajout récent</option>
              </Select>

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

              <Text fontWeight="bold">Badges :</Text>
              <BadgesToggles
                selected={localQuery.badges}
                onChange={(updated) =>
                  setLocalQuery({ ...localQuery, badges: updated })
                }
              />
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter justifyContent="space-between">
            <Button
              variant="ghost"
              onClick={() => setLocalQuery(defaultRestaurantFilters)}
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

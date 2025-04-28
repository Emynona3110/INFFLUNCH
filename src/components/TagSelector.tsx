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
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { BsPlusLg } from "react-icons/bs";

interface TagSelectorProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

const availableTags = [
  "Italien",
  "Végétarien",
  "Asiatique",
  "Burgers",
  "Français",
  "Pâtisserie",
];

const TagSelector = ({ selectedTags, setSelectedTags }: TagSelectorProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      const updated = [...selectedTags, newTag].sort();
      setSelectedTags(updated);
      setNewTag(""); // reset après ajout
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  // 👇 Liste des tags encore sélectionnables
  const selectableTags = availableTags
    .filter((tag) => !selectedTags.includes(tag))
    .sort();

  return (
    <>
      <IconButton
        aria-label="Ajouter un tag"
        icon={<Icon as={BsPlusLg} boxSize={6} />}
        onClick={onOpen}
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
          <AlertDialogHeader>Choisir des tags</AlertDialogHeader>
          <AlertDialogCloseButton />

          <AlertDialogBody>
            {/* Liste des tags sélectionnés */}
            <Wrap mb={4}>
              {selectedTags.length > 0 ? (
                [...selectedTags].sort().map((tag) => (
                  <WrapItem key={tag}>
                    <Tag
                      size="md"
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
                <WrapItem>
                  <Tag variant="outline" colorScheme="gray">
                    Aucun tag sélectionné
                  </Tag>
                </WrapItem>
              )}
            </Wrap>

            {/* Sélecteur de nouveaux tags */}
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
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Fermer
            </Button>
            <Button
              colorScheme="blue"
              ml={3}
              onClick={handleAddTag}
              isDisabled={!newTag}
            >
              Ajouter
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TagSelector;

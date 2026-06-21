import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  liked: boolean;
  onToggle: (liked: boolean) => Promise<void>;
  /** Classes du bouton (taille, fond…). */
  className?: string;
  /** Classes de l'icône (taille). */
  iconClassName?: string;
  /** Couleur du cœur vide. */
  emptyClassName?: string;
  /** Empêche le clic de remonter (cards cliquables). */
  stopPropagation?: boolean;
}

/**
 * Bouton favori partagé (cards + fiche restaurant). État optimiste local,
 * cœur plein en surimpression animé (scale) pour éviter tout clignotement, et
 * rollback + toast en cas d'erreur.
 */
const LikeButton = ({
  liked,
  onToggle,
  className,
  iconClassName = "h-5 w-5",
  emptyClassName = "text-slate-300 dark:text-slate-600",
  stopPropagation,
}: LikeButtonProps) => {
  const [isLiked, setIsLiked] = useState(liked);

  // Resync quand la prop change (favoris chargés après le 1er rendu).
  useEffect(() => setIsLiked(liked), [liked]);

  const toggle = async () => {
    const previous = isLiked;
    const next = !previous;
    setIsLiked(next);
    try {
      await onToggle(next);
    } catch {
      setIsLiked(previous);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les favoris.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        toggle();
      }}
      aria-label={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={isLiked}
      className={cn(
        "relative grid place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {/* Les deux cœurs sont empilés dans la MÊME cellule de grille
          (col-start-1/row-start-1) → centrage identique, donc parfaitement
          superposés (pas de décalage entre vide et plein). Léger translate-y
          pour optiquement centrer la forme (haute dans son viewBox). */}
      <FaRegHeart
        className={cn(
          iconClassName,
          emptyClassName,
          "col-start-1 row-start-1 translate-y-[1.5%]"
        )}
      />
      <AnimatePresence initial={false}>
        {isLiked && (
          <motion.span
            key="full"
            className="col-start-1 row-start-1 grid place-items-center"
            initial={{ scale: 0 }}
            // Légèrement plus grand que le cœur vide pour recouvrir son liseré.
            animate={{ scale: 1.12 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <FaHeart
              className={cn(iconClassName, "translate-y-[1.5%]")}
              style={{ color: "#ff6b81" }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default LikeButton;

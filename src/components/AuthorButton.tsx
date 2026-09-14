import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  email?: string | null;
  className?: string;
  /** Contenu à la place du nom (un avatar, par exemple). */
  children?: ReactNode;
}

/**
 * Nom d'auteur cliquable : mène à son profil (/profil/:id — et « Mon Profil »
 * pour soi, la page fait la redirection). À poser partout où un nom apparaît
 * (avis, photos, menus, tablées) pour que « qui a écrit ça ? » ait toujours
 * la même réponse — un clic.
 */
const AuthorButton = ({ userId, email, className, children }: Props) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      title="Voir le profil"
      onClick={(e) => {
        // Souvent posé dans une tuile elle-même cliquable : on ne l'ouvre pas.
        e.stopPropagation();
        navigate(`/profil/${userId}`);
      }}
      className={cn(
        "cursor-pointer text-left underline-offset-2 hover:underline",
        className
      )}
    >
      {children ?? formatAuthorName(email)}
    </button>
  );
};

export default AuthorButton;

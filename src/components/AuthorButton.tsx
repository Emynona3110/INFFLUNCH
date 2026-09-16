import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatAuthorName } from "@/utils/authorName";
import { profilePath } from "@/utils/profilePath";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  userId: string;
  email?: string | null;
  /** Contenu à la place du nom (un avatar, par exemple). */
  children?: ReactNode;
}

/**
 * Nom d'auteur cliquable : mène à son profil (/profil/:id — et « Mon Profil »
 * pour soi, la page fait la redirection). À poser partout où un nom apparaît
 * (avis, photos, menus, tablées) pour que « qui a écrit ça ? » ait toujours
 * la même réponse — un clic.
 *
 * Ref transmise et attributs passés au bouton : Radix (Tooltip) s'y accroche
 * quand l'auteur sert de déclencheur — sans ça, l'infobulle ne s'ouvre pas.
 */
const AuthorButton = forwardRef<HTMLButtonElement, Props>(
  ({ userId, email, className, children, onClick, ...rest }, ref) => {
    const navigate = useNavigate();
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        onClick={(e) => {
          onClick?.(e);
          // Souvent posé dans une tuile elle-même cliquable : on ne l'ouvre pas.
          e.stopPropagation();
          navigate(profilePath(userId, email));
        }}
        className={cn(
          // p-0 / m-0 : un bouton natif a un padding qui décalerait le nom
          // par rapport au texte aligné dessous.
          "m-0 cursor-pointer p-0 text-left underline-offset-2 hover:underline",
          className
        )}
      >
        {children ?? formatAuthorName(email)}
      </button>
    );
  }
);

AuthorButton.displayName = "AuthorButton";

export default AuthorButton;

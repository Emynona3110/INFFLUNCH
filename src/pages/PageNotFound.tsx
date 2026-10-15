import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Page introuvable : affichée DANS le Layout du site (UserPage, profil
 *  inconnu), pas dans un Layout à elle — sinon un second écran pleine
 *  hauteur, avec son propre footer, s'imbriquait dans la page. */
const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="tw-scope flex flex-1 flex-col items-center justify-center text-center">
      <div
        role="heading"
        aria-level={1}
        className="font-display text-4xl font-bold text-foreground"
      >
        404 — Page introuvable
      </div>
      <p className="mt-3 text-foreground/60">
        Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Button className="mt-6" onClick={() => navigate("/")}>
        Retour à l'accueil
      </Button>
    </div>
  );
};

export default PageNotFound;

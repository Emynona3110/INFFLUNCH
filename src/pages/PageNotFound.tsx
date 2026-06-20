import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <Layout centerContent>
      <div className="tw-scope text-center">
        <div
          role="heading"
          aria-level={1}
          className="font-display text-4xl font-extrabold text-foreground"
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
    </Layout>
  );
};

export default PageNotFound;

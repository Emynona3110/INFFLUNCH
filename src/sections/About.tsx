import { motion } from "framer-motion";
import { FiArrowUpRight, FiMessageSquare } from "react-icons/fi";
import { Card } from "@/components/ui/card";

const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tw-scope flex w-full items-center justify-center px-4"
    >
      <Card className="w-full max-w-2xl p-8">
        <div
          role="heading"
          aria-level={1}
          className="text-center font-display text-2xl font-extrabold text-card-foreground"
        >
          À propos d'INFFLUNCH
        </div>

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/80">
          <p>
            <span className="font-semibold text-foreground">INFFLUNCH</span> est
            un projet personnel visant à offrir aux collaborateurs d'
            <span className="font-semibold text-foreground">INFFLUX</span> un
            espace centralisé pour découvrir les restaurants situés autour de
            l'entreprise, ainsi que partager leurs avis et recommandations.
          </p>

          <p>
            Le site est actuellement en cours de développement — de nouvelles
            fonctionnalités arriveront très bientôt !
          </p>

          <p>
            N'hésite pas à recommander{" "}
            <span className="font-semibold text-foreground">INFFLUNCH</span> aux
            autres collaborateurs 😉
          </p>

          <p>
            Si tu rencontres un problème ou souhaites faire une suggestion, tu
            peux t'exprimer juste ici{" "}
            <FiMessageSquare className="inline h-4 w-4 align-text-bottom text-primary" />
            {/* Même repère que dans « Mes demandes » : la flèche pointe vers le
                bouton, en haut à droite de la barre. */}
            <FiArrowUpRight className="inline h-4 w-4 align-text-bottom text-foreground/40" />
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default About;

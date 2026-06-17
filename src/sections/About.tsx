import { Card } from "@/components/ui/card";

const About = () => {
  return (
    <div className="tw-scope flex w-full items-center justify-center px-4">
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
            Si vous rencontrez un problème ou souhaitez faire une suggestion,
            n'hésitez pas à contacter{" "}
            <span className="font-semibold text-foreground">LLS</span> 😉
          </p>
        </div>
      </Card>
    </div>
  );
};

export default About;

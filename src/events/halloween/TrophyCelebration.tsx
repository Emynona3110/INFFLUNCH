import { useNavigate } from "react-router-dom";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TrophyStage from "@/components/TrophyStage";
import { TROPHIES_BY_ID } from "@/data/trophies";
import useSession from "@/hooks/useSession";
import { profilePath } from "@/utils/profilePath";
import { closeCelebration, useCelebration } from "./celebration";

const TROPHY = TROPHIES_BY_ID.halloween_2026_candies;

/**
 * Fenêtre du trophée « Trick or Treat », ouverte après la prise du 4e
 * bonbon : la citrouille-panier tombe et les bonbons s'y entassent (même
 * scène que la fiche du trophée, TrophyStage), puis le lien vers son profil,
 * où le trophée est désormais sur l'étagère.
 */
const TrophyCelebration = () => {
  const open = useCelebration();
  const { sessionData } = useSession();
  const navigate = useNavigate();
  const user = sessionData?.user;

  return (
    // `overflow-hidden` : le haut de la popup rogne la chute de l'intro.
    <Dialog open={open} onClose={closeCelebration} showClose className="max-w-sm overflow-hidden">
      {open && <TrophyStage trophy={TROPHY} className="mx-auto h-52 w-40 cursor-pointer sm:h-60 sm:w-48" />}
      <div className="mt-3 text-center">
        <DialogTitle>Trophée {TROPHY.event}</DialogTitle>
        <p className="mb-0 mt-1.5 text-sm text-foreground/70">
          Tu as retrouvé les quatre bonbons cachés sur le site.
          Ta citrouille pleine t'attend sur ton profil !
        </p>
      </div>
      {user && (
        <div className="mt-5 flex justify-center">
          <Button
            onClick={() => {
              closeCelebration();
              navigate(profilePath(user.id, user.email));
            }}
          >
            Voir mon profil
          </Button>
        </div>
      )}
    </Dialog>
  );
};

export default TrophyCelebration;

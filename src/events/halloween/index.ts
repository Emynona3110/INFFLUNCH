import type { EventTheme } from "..";
import { BatLogotype, BatMonogramme } from "./BatLogo";
import Candles from "./Candles";
import SpiderWeb from "./SpiderWeb";
import SearchLollipop from "./SearchLollipop";
import MapCandyCorn from "./MapCandyCorn";
import RouletteMint from "./RouletteMint";
import HalloweenOverlay from "./HalloweenOverlay";
import QuestProgress from "./QuestProgress";
import { replayAnnounce } from "./QuestAnnounce";
import { openCelebration } from "./celebration";
import useCandies from "./useCandies";
import mono from "./anim/halloween-intro-monogramme.svg?raw";
import monoWhite from "./anim/halloween-intro-monogramme-blanc.svg?raw";
import logotype from "./anim/halloween-intro-logotype.svg?raw";
import logotypeWhite from "./anim/halloween-intro-logotype-blanc.svg?raw";

/**
 * Halloween : une chauve-souris remplace le point du « i » (navbar, intros de
 * connexion), des bougies sur le pied de page, une araignée sur Déjeuner
 * (elle tient un bonbon de la chasse, cf. useCandies), une sucette à la
 * place de la loupe du classement, un bonbon maïs à la place du repère
 * d'INFFLUX sur la carte et une menthe à la place des dés de la roulette
 * (les quatre bonbons de la chasse). Le monogramme de chargement
 * (citrouille qui saute) est public/events/halloween/chargement.svg, posé
 * par index.html.
 */
const halloween: EventTheme = {
  Monogramme: BatMonogramme,
  Logotype: BatLogotype,
  FooterDecor: Candles,
  lunchDecor: { Decor: SpiderWeb, useLoading: () => useCandies().loading },
  SearchIcon: SearchLollipop,
  MapHomePin: MapCandyCorn,
  RouletteIcon: RouletteMint,
  Overlay: HalloweenOverlay,
  ProfileQuest: QuestProgress,
  replays: [
    {
      label: "Annonce de la chasse aux bonbons",
      detail: "Rouvre la popup de première visite (la page se recharge).",
      run: replayAnnounce,
    },
    {
      label: "Fenêtre du trophée",
      detail: "Rejoue la fenêtre du 4e bonbon, sans rien gagner.",
      run: openCelebration,
    },
  ],
  loginIntro: { mono, monoWhite, logotype, logotypeWhite },
};

export default halloween;

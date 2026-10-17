import QuestAnnounce from "./QuestAnnounce";
import TrophyCelebration from "./TrophyCelebration";

/** Fenêtres de l'évènement, montées une fois sur les pages connectées :
 *  annonce de la chasse aux bonbons, trophée au 4e bonbon. */
const HalloweenOverlay = () => (
  <>
    <QuestAnnounce />
    <TrophyCelebration />
  </>
);

export default HalloweenOverlay;

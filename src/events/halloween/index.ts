import type { EventTheme } from "..";
import { BatLogotype, BatMonogramme } from "./BatLogo";
import Candles from "./Candles";
import mono from "./anim/halloween-intro-monogramme.svg?raw";
import monoWhite from "./anim/halloween-intro-monogramme-blanc.svg?raw";
import logotype from "./anim/halloween-intro-logotype.svg?raw";
import logotypeWhite from "./anim/halloween-intro-logotype-blanc.svg?raw";

/**
 * Halloween : une chauve-souris remplace le point du « i » (navbar, intros de
 * connexion), des bougies sur le pied de page. Le monogramme de chargement
 * (citrouille qui saute) est public/events/halloween/chargement.svg, posé
 * par index.html.
 */
const halloween: EventTheme = {
  Monogramme: BatMonogramme,
  Logotype: BatLogotype,
  FooterDecor: Candles,
  loginIntro: { mono, monoWhite, logotype, logotypeWhite },
};

export default halloween;

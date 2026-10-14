// Démarrage du site : le monogramme d'index.html est peut-être déjà affiché
// (il apparaît lui aussi après DELAY_MS, 750 ms). Tant que la première page n'est pas
// révélée, le délai court depuis l'ouverture de la page et non depuis le
// montage : le relais se fait sans trou ni clignotement.
let booting = true;
/** La première page est révélée : les chargements suivants reprennent le
 *  délai normal. */
export const markBootDone = () => {
  booting = false;
};
export const isBooting = () => booting;

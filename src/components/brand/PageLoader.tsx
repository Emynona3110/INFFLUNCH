import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import loaderRaw from "@/assets/brand/anim/infflunch-anim-chargement.svg?raw";
import loaderWhiteRaw from "@/assets/brand/anim/infflunch-anim-chargement-blanc.svg?raw";
import { svgDataUri } from "./inlineSvg";
import { isBooting } from "./bootState";

const loader = svgDataUri(loaderRaw);
const loaderWhite = svgDataUri(loaderWhiteRaw);

// Sous ce délai, rien ne s'affiche : un chargement court ferait clignoter
// l'animation une fraction de seconde.
const DELAY_MS = 1000;
/** Durée des fondus d'apparition et de disparition (s). */
const FADE_S = 0.25;

/** Animation de chargement d'un évènement (citrouille d'Halloween…) : celle
 *  qu'index.html a posée dans #boot-loader, reprise telle quelle (SVG inline,
 *  thème clair/sombre géré par ses propres styles). */
const eventLoaderMarkup = () =>
  document.querySelector("#boot-loader svg[data-event]")?.outerHTML;

const defaultDelay = () =>
  isBooting() ? Math.max(0, DELAY_MS - performance.now()) : DELAY_MS;

/** Attente pleine zone : monogramme animé (le point saute, les couverts trinquent). */
export default function PageLoader({ delay: delayProp }: { delay?: number }) {
  const [delay] = useState(() => delayProp ?? defaultDelay());
  const [visible, setVisible] = useState(delay === 0);
  // Objet stable : React 19 réécrit le HTML (et relance l'animation) dès que
  // l'objet `dangerouslySetInnerHTML` change.
  const [eventLoader] = useState(() => {
    const markup = eventLoaderMarkup();
    return markup ? { __html: markup } : null;
  });
  // Au démarrage, le monogramme d'index.html est peut-être déjà en train
  // d'apparaître au même endroit (fondu de FADE_S à partir de DELAY_MS) : on
  // reprend son fondu là où il en est — ni flash, ni second fondu.
  const [fade] = useState(() => {
    if (!isBooting()) return { from: 0, duration: FADE_S };
    const done = (performance.now() - DELAY_MS) / 1000 / FADE_S;
    const from = Math.min(1, Math.max(0, done));
    return { from, duration: FADE_S * (1 - from) };
  });

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;
  return (
    <motion.div
      role="status"
      aria-label="Chargement"
      initial={{ opacity: fade.from }}
      animate={{ opacity: 1 }}
      transition={{ duration: fade.duration, ease: "linear" }}
    >
      {eventLoader ? (
        <div
          className="[&>svg]:block [&>svg]:h-[5.375rem] [&>svg]:w-auto"
          dangerouslySetInnerHTML={eventLoader}
        />
      ) : (
        <>
          <img src={loader} alt="" className="block h-[5.375rem] w-auto dark:hidden" />
          <img src={loaderWhite} alt="" className="hidden h-[5.375rem] w-auto dark:block" />
        </>
      )}
    </motion.div>
  );
}

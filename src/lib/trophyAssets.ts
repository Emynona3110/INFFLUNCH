import type { ReactNode } from "react";
import type { Trophy, TrophyId } from "@/data/trophies";

/** SVG des animations d'un trophée, téléchargés une fois (fichiers de
 *  public/). Insérés en ligne par TrophyStage pour pouvoir les rejouer depuis
 *  le début (une <img> garde le fil de son animation d'un affichage à
 *  l'autre). */
const svgCache = new Map<string, Promise<string>>();

export const loadSvg = (url: string) => {
  let p = svgCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.text());
    svgCache.set(url, p);
  }
  return p;
};

export type IntroProps = { dark: boolean; onDone: () => void };

/** Intro de chaque trophée : calques animés, module chargé à la demande
 *  (pas dans le code des pages). */
export const INTRO_LOADERS: Record<
  TrophyId,
  () => Promise<{ default: (p: IntroProps) => ReactNode }>
> = {
  halloween_2026_candies: () => import("@/components/trophies/HalloweenIntro"),
};

/** Précharge ce que la fiche d'un trophée affichera (intro, saut) : elle
 *  s'ouvre sans attente. */
export const preloadTrophy = (t: Trophy, dark: boolean) => {
  void INTRO_LOADERS[t.id]();
  void loadSvg(dark ? t.animatedDark : t.animated);
};

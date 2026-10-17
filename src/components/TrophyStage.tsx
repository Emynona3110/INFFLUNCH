import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Trophy, TrophyId } from "@/data/trophies";
import { INTRO_LOADERS, loadSvg } from "@/lib/trophyAssets";

/** Durée d'un saut en boucle (animation 03 : 1,5 s, repos compris). */
const JUMP_CYCLE_MS = 1500;

/** Intro de chaque trophée, chargée à la demande (calques animés). */
const INTROS = Object.fromEntries(
  (Object.keys(INTRO_LOADERS) as TrophyId[]).map((id) => [id, lazy(INTRO_LOADERS[id])]),
) as Record<TrophyId, ReturnType<typeof lazy<(typeof INTRO_LOADERS)[TrophyId] extends () => Promise<{ default: infer C }> ? C : never>>>;

const useSvg = (url: string) => {
  const [svg, setSvg] = useState<{ url: string; html: { __html: string } } | null>(null);
  useEffect(() => {
    let alive = true;
    loadSvg(url).then((text) => {
      // Objet stable par fichier : React 19 réécrirait le SVG (et rejouerait
      // l'animation) à chaque rendu avec un objet neuf.
      if (alive) setSvg({ url, html: { __html: text } });
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return svg?.url === url ? svg.html : null;
};

/**
 * Le trophée en grand (sa fiche, la fenêtre où on le gagne) : l'intro joue à
 * l'affichage (la citrouille tombe, les bonbons s'y entassent) et reste sur
 * sa dernière image, le repos ; au survol (ou au toucher) la citrouille
 * saute en boucle, et finit son saut avant de se reposer.
 *
 * L'intro n'est jamais remplacée (une image de repos à sa place clignotait
 * le temps de s'afficher) : elle reste en place, figée sur sa fin, et le saut
 * se pose PAR-DESSUS (l'intro masquée en opacité, sans la démonter : remise
 * à l'écran, elle ne rejoue pas).
 */
const TrophyStage = ({ trophy, className }: { trophy: Trophy; className?: string }) => {
  const dark = useTheme().theme === "dark";
  const Intro = INTROS[trophy.id];
  const jump = useSvg(dark ? trophy.animatedDark : trophy.animated);
  const [phase, setPhase] = useState<"intro" | "rest" | "jump">("intro");
  // Saut : numéro (remonte le SVG, qui repart du début) et heure de départ.
  const [jumpKey, setJumpKey] = useState(0);
  const jumpStart = useRef(0);
  const stopTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(stopTimer.current), []);

  const startJump = () => {
    window.clearTimeout(stopTimer.current);
    if (phase === "intro" || phase === "jump" || !jump) return;
    jumpStart.current = performance.now();
    setJumpKey((k) => k + 1);
    setPhase("jump");
  };
  // Le saut en cours va jusqu'au bout (fin de cycle) avant le repos.
  const stopJump = () => {
    if (phase !== "jump") return;
    const elapsed = performance.now() - jumpStart.current;
    const left = JUMP_CYCLE_MS - (elapsed % JUMP_CYCLE_MS);
    window.clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => setPhase("rest"), left);
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={startJump}
      onMouseLeave={stopJump}
      onClick={() => (phase === "jump" ? stopJump() : startJump())}
    >
      <div className={cn("absolute inset-0", phase === "jump" && jump && "opacity-0")}>
        <Suspense fallback={null}>
          <Intro dark={dark} onDone={() => setPhase((p) => (p === "intro" ? "rest" : p))} />
        </Suspense>
      </div>
      {phase === "jump" && jump && (
        <div
          key={jumpKey}
          className="absolute inset-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible"
          dangerouslySetInnerHTML={jump}
        />
      )}
    </div>
  );
};

export default TrophyStage;

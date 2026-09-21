import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useAchievements from "@/hooks/useAchievements";

/** Nombre de bouchées pour finir le cookie : les 4 premières le grignotent,
 *  la dernière l'avale. */
const BITES = 5;

/** Image du cookie (Recraft, recadrée au carré). */
const COOKIE_SRC = "/easter/cookie.svg";

/** Morsures successives : centre et rayon en % de l'image, et `dir` la
 *  direction (degrés, 90 = vers le bas) dans laquelle les dents s'enfoncent.
 *  On mange le cookie comme tout le monde : par le haut, en descendant —
 *  deux bouchées en haut, deux au milieu, la dernière emporte le reste. Les
 *  trous se chevauchent (voisins horizontaux comme verticaux) : pas de
 *  lamelle de cookie oubliée entre deux bouchées. */
const BITE_SHAPES = [
  { x: 28, y: 6, r: 28, dir: 95 },
  { x: 72, y: 8, r: 28, dir: 85 },
  { x: 24, y: 42, r: 27, dir: 100 },
  { x: 72, y: 44, r: 27, dir: 80 },
  // La dernière : une seule grande bouchée qui emporte tout ce qui reste.
  { x: 50, y: 78, r: 52, dir: 90 },
];

/** Nombre de dents sur le bord d'une morsure, et leur écartement angulaire. */
const TEETH = 5;
const TOOTH_STEP = (30 * Math.PI) / 180;

/** Une morsure = un grand trou, plus une rangée de petits trous à cheval sur
 *  son bord, du côté où les dents s'enfoncent : le contour festonné qu'elles
 *  laissent. Chaque trou est une couche du masque. */
const biteHoles = (b: { x: number; y: number; r: number; dir: number }) => {
  const toward = (b.dir * Math.PI) / 180;
  const teeth = Array.from({ length: TEETH }, (_, i) => {
    const a = toward + (i - (TEETH - 1) / 2) * TOOTH_STEP;
    return {
      x: b.x + b.r * Math.cos(a),
      y: b.y + b.r * Math.sin(a),
      r: b.r * 0.45,
    };
  });
  return [b, ...teeth];
};

/** Masque « tout sauf les morsures » : une couche par trou, intersectées.
 *  Les rayons sont en fraction de `--cookie-size` (la largeur de l'image),
 *  pour garder leur proportion quelle que soit la largeur d'écran. */
const biteMask = (count: number) => {
  if (count === 0) return undefined;
  const layers = BITE_SHAPES.slice(0, count)
    .flatMap(biteHoles)
    .map(
      (h) =>
        `radial-gradient(circle calc(var(--cookie-size) * ${h.r / 100}) at ${h.x}% ${h.y}%, transparent 97%, #000 100%)`,
    )
    .join(", ");
  return {
    WebkitMaskImage: layers,
    maskImage: layers,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
  } as React.CSSProperties;
};

/** Teintes du cookie (pâte claire, bord doré, chocolat). */
const CRUMB_COLORS = ["#e8a463", "#d68448", "#b5772a", "#743d2c", "#562618"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pickColor = () =>
  CRUMB_COLORS[Math.floor(Math.random() * CRUMB_COLORS.length)];

/** Pesanteur et rebond des miettes (px/s², coefficient de restitution). */
const GRAVITY = 2200;
const BOUNCE = 0.28;

/** Une miette : position en coordonnées DOCUMENT (elle reste donc où elle
 *  est tombée quand on fait défiler), vitesse, rotation, et le sol qu'elle
 *  va toucher — le bas de l'écran au moment où elle a été lâchée. */
interface Crumb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
  ground: number;
  /** Murs gauche et droit : les bords de l'écran au moment du lâcher. */
  left: number;
  right: number;
  resting: boolean;
}

let nextId = 0;

/** Miettes lâchées à un point de l'écran : elles se détachent avec un peu
 *  d'élan, puis tombent — vraie chute, rebond mou sur le sol, et elles y
 *  restent. `spread` étale les points de départ (px). */
const spawnCrumbs = (
  cx: number,
  cy: number,
  count: number,
  spread: number,
  punch: number,
): Crumb[] =>
  Array.from({ length: count }, () => {
    const size = rand(2.5, 7);
    return {
      id: nextId++,
      x: window.scrollX + cx + rand(-spread, spread),
      y: window.scrollY + cy + rand(-spread, spread),
      vx: rand(-punch, punch),
      vy: rand(-punch * 0.6, punch * 0.3),
      angle: rand(0, 360),
      spin: rand(-540, 540),
      size,
      color: pickColor(),
      // `y` est le haut de la miette : au repos, son bord bas affleure
      // exactement le bord inférieur de l'écran.
      ground: window.scrollY + window.innerHeight - size * 0.8,
      left: window.scrollX,
      right: window.scrollX + window.innerWidth - size,
      resting: false,
    };
  });

/** Un pas de simulation ; renvoie vrai tant que la miette bouge. */
const step = (c: Crumb, dt: number) => {
  if (c.resting) return false;
  c.vy += GRAVITY * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.angle += c.spin * dt;
  // Une miette qui file vers le bord de l'écran rebondit dessus : rien ne
  // sort du cadre, donc rien ne vient agrandir la page (barre de défilement
  // qui apparaît, mise en page qui saute).
  if (c.x < c.left) {
    c.x = c.left;
    c.vx = -c.vx * 0.5;
  } else if (c.x > c.right) {
    c.x = c.right;
    c.vx = -c.vx * 0.5;
  }
  if (c.y >= c.ground) {
    c.y = c.ground;
    if (Math.abs(c.vy) < 60) {
      // Plus assez d'énergie pour rebondir : elle se pose, à plat (une
      // miette de travers aurait un coin sous le bord de l'écran).
      c.resting = true;
      c.vx = 0;
      c.vy = 0;
      c.spin = 0;
      c.angle = 0;
      return false;
    }
    c.vy = -c.vy * BOUNCE;
    c.vx *= 0.55;
    c.spin *= 0.4;
  }
  return true;
};

/**
 * Easter egg « Cookie » (page confidentialité) : le mot « cookie »,
 * en orange dans une phrase qui affirme qu'il n'y en a pas, est le seul du
 * site. Un clic le fait apparaître en grand au milieu de l'écran ; il faut le
 * croquer cinq fois pour le finir — et le succès secret tombe. Les miettes
 * tombent au bas de l'écran et y restent (elles s'accumulent si on en
 * remange un), jusqu'à ce qu'on quitte la page.
 */
const CookieWord = () => {
  const { unlock } = useAchievements();
  const [open, setOpen] = useState(false);
  const [bites, setBites] = useState(0);
  const [gone, setGone] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Les miettes vivent hors de React : la liste est un ref, la simulation
  // déplace les éléments directement (60 fois par seconde, sans re-rendu).
  // Seul le nombre de miettes est un état, pour créer leurs éléments.
  const crumbs = useRef<Crumb[]>([]);
  const nodes = useRef(new Map<number, HTMLSpanElement>());
  const [count, setCount] = useState(0);
  /** Hauteur du calque = celle du document au moment du lâcher : avec
   *  `overflow: hidden`, une miette qui dépasse (coin d'une miette qui tourne
   *  au sol) est rognée au lieu d'allonger la page. */
  const [layerHeight, setLayerHeight] = useState(0);
  const frame = useRef<number | null>(null);

  const paint = (c: Crumb) => {
    const el = nodes.current.get(c.id);
    if (el) el.style.transform = `translate(${c.x}px, ${c.y}px) rotate(${c.angle}deg)`;
  };

  const simulate = () => {
    let last = performance.now();
    const tick = (now: number) => {
      // Onglet resté en arrière-plan : pas de saut géant au retour.
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      let moving = false;
      for (const c of crumbs.current) {
        if (step(c, dt)) moving = true;
        paint(c);
      }
      frame.current = moving ? requestAnimationFrame(tick) : null;
    };
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** Lâche des miettes depuis un point de l'image (en % de celle-ci). */
  const drop = (
    at: { x: number; y: number },
    n: number,
    spread: number,
    punch: number,
  ) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + (rect.width * at.x) / 100;
    const cy = rect.top + (rect.height * at.y) / 100;
    crumbs.current.push(...spawnCrumbs(cx, cy, n, spread, punch));
    setCount(crumbs.current.length);
    setLayerHeight((h) => Math.max(h, document.documentElement.scrollHeight));
    simulate();
  };

  const show = () => {
    setBites(0);
    setGone(false);
    setOpen(true);
  };

  const bite = () => {
    if (gone) return;
    if (bites + 1 < BITES) {
      setBites(bites + 1);
      drop(BITE_SHAPES[bites], 9, 10, 90);
      return;
    }
    setGone(true);
    setBites(BITES);
    drop({ x: 50, y: 70 }, 26, 50, 160);
    unlock("cookie");
  };

  // Le dernier morceau parti, on range ; les miettes, elles, finissent de
  // tomber dehors.
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setOpen(false), 500);
    return () => clearTimeout(t);
  }, [gone]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="cookie"
        className="cursor-pointer font-semibold text-accent underline-offset-2 hover:underline"
      >
        cookie
      </button>
      {open &&
        createPortal(
          // Même empilement que les popups : au-dessus de la navbar. Ni clic
          // à côté ni Échap : une fois sorti, le cookie se mange — ou reste
          // là jusqu'à ce qu'on quitte la page (sans succès, alors).
          <div className="tw-scope pointer-events-none fixed inset-0 z-[1100] flex items-center justify-center">
            {/* Pas de voile : la page reste lisible et cliquable autour, seul
                le cookie capte les clics. */}
            <div
              className="cookie-drop pointer-events-auto relative"
              style={
                { "--cookie-size": "min(70vw, 300px)" } as React.CSSProperties
              }
            >
              <button
                type="button"
                onClick={bite}
                aria-label="Croquer le cookie"
                // La clé relance la petite secousse à chaque bouchée.
                key={bites}
                // L'ombre portée est sur le bouton, PAS sur l'image masquée :
                // posée sur elle, elle serait découpée par le masque aussi et
                // laisserait des taches sombres autour des morsures. Ici elle
                // épouse la silhouette déjà croquée.
                className="cookie-bite block cursor-pointer drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
              >
                <img
                  ref={imgRef}
                  src={COOKIE_SRC}
                  alt=""
                  draggable={false}
                  style={{
                    width: "var(--cookie-size)",
                    height: "var(--cookie-size)",
                    ...biteMask(bites),
                  }}
                  className="block select-none"
                />
              </button>
            </div>
          </div>,
          document.body,
        )}
      {count > 0 &&
        createPortal(
          // Calque en coordonnées document (absolu, pas fixe) : une miette
          // tombée reste où elle est quand on fait défiler la page. Au-dessus
          // du voile du cookie, pour ne pas être assombrie pendant la chute.
          <div
            aria-hidden
            style={{ height: layerHeight }}
            className="pointer-events-none absolute left-0 top-0 z-[1200] w-full overflow-hidden"
          >
            {crumbs.current.map((c) => (
              <span
                key={c.id}
                ref={(el) => {
                  if (el) {
                    nodes.current.set(c.id, el);
                    paint(c);
                  } else nodes.current.delete(c.id);
                }}
                className="absolute left-0 top-0 rounded-[2px] will-change-transform"
                style={{
                  width: c.size,
                  height: c.size * 0.8,
                  background: c.color,
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default CookieWord;

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/*
 * Bonbon ramassé : une copie posée au-dessus de toute la page, exactement sur
 * l'original, joue la prise en quatre temps (halloween.css, hl-grab) :
 * élan (il se tasse), éclat (il jaillit au premier plan en se redressant,
 * avec une onde de choc et une gerbe de confettis aux couleurs des bonbons),
 * tenue (il oscille), poche (il se rétracte en tournant).
 */

/** Durée de la scène (halloween.css : hl-grab, 1,1 s). */
const SCENE_MS = 1150;

/** Taille d'écran visée au plus fort de la prise (px), quel que soit le
 *  bonbon d'origine (minuscule dans la loupe, plus grand sous l'araignée). */
const TARGET_PX = 120;

/** Gerbe : angle (deg), distance (px), taille (px), couleur, forme. */
const BITS = Array.from({ length: 14 }, (_, i) => {
  const colors = ["#EA580C", "#5478D4", "#FFFFFF", "#EA580C", "#113894"];
  return {
    angle: i * (360 / 14) + ((i * 37) % 17) - 8,
    dist: 70 + ((i * 53) % 45),
    size: 6 + ((i * 29) % 5),
    color: colors[i % colors.length],
    round: i % 3 !== 0,
  };
});

const CandyGrab = ({
  m,
  width,
  onDone,
  children,
}: {
  /** Matrice écran du centre de l'original (rotation et échelle comprises). */
  m: DOMMatrix;
  /** Largeur du dessin `children`, dans son propre repère (avant `m`). */
  width: number;
  onDone: () => void;
  /** Le dessin, centré sur le point de `m`, à sa taille d'origine. */
  children: ReactNode;
}) => {
  // Une petite secousse sur mobile (sans effet ailleurs, ni sur iPhone).
  useEffect(() => {
    try {
      navigator.vibrate?.(30);
    } catch {
      // Vibration refusée : la prise reste visuelle.
    }
  }, []);

  const screenWidth = width * Math.hypot(m.a, m.b) || 1;
  const k = Math.min(7, Math.max(2.5, TARGET_PX / screenWidth));
  const unrot = (-Math.atan2(m.b, m.a) * 180) / Math.PI;

  useEffect(() => {
    const t = window.setTimeout(onDone, SCENE_MS);
    return () => window.clearTimeout(t);
    // Une scène par prise : `onDone` n'est lu qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <>
      <div
        className="hl-grab-at"
        style={{ transform: `translate(${m.e}px, ${m.f}px)` }}
      >
        <span className="hl-grab-ring" />
        {BITS.map((b, i) => (
          <span
            key={i}
            className="hl-grab-bit"
            style={
              {
                "--hl-a": `${b.angle}deg`,
                "--hl-d": `${b.dist}px`,
                width: b.size,
                height: b.size,
                background: b.color,
                borderRadius: b.round ? "50%" : 2,
                boxShadow:
                  b.color === "#FFFFFF" ? "0 0 0 1.5px #5478D4" : undefined,
              } as CSSProperties
            }
          />
        ))}
        <div
          className="hl-grab"
          style={
            {
              "--hl-m": `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, 0, 0)`,
              "--hl-unrot": `${unrot}deg`,
              "--hl-k": k,
            } as CSSProperties
          }
        >
          <div className="hl-grab-art">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default CandyGrab;

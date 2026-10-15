import { useState, type AnimationEvent } from "react";
import { ADMIN_LETTERS, ADMIN_SHIFT, LETTERS, MONO } from "@/components/brand/logoPaths";
import "@/components/brand/Logo.css";
import "./halloween.css";

const ORANGE = "#EA580C";
const WING =
  "M8 -6 C30 -40 70 -52 96 -38 C104 -30 100 -14 92 -8 C86 -14 76 -14 72 -4 C66 -12 54 -12 50 0 C42 -8 26 -6 10 8 Z";

/** Chauve-souris posée à la place du point du « i » (repère : centre du corps). */
const Bat = ({ x, y, scale }: { x: number; y: number; scale: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className="hl-hopb">
      <g transform="scale(-1 1)">
        <path className="hl-wing" fill={ORANGE} d={WING} />
      </g>
      <path className="hl-wing" fill={ORANGE} d={WING} />
      <g fill={ORANGE}>
        <ellipse cx="0" cy="4" rx="14" ry="18" />
        <circle cx="0" cy="-14" r="13" />
        <ellipse cx="-8" cy="-27" rx="6" ry="9" transform="rotate(-20 -8 -27)" />
        <ellipse cx="8" cy="-27" rx="6" ry="9" transform="rotate(20 8 -27)" />
      </g>
    </g>
  </g>
);

/**
 * Au clic ou au toucher : trois battements d'ailes et un petit bond. Comme le
 * saut du point du logo habituel : un appui pendant l'animation est ignoré,
 * elle va jusqu'au bout avant de pouvoir être rejouée.
 */
const useFlap = () => {
  const [flap, setFlap] = useState(false);
  return {
    flapClass: flap ? "hl-flap" : "",
    onPointerDown: () => {
      if (!flap) setFlap(true);
    },
    onAnimationEnd: (e: AnimationEvent<SVGSVGElement>) => {
      if (flap && e.animationName === "hl-hopb") setFlap(false);
    },
  };
};

/** Monogramme d'Halloween (navbar mobile) : la chauve-souris remplace le point. */
export function BatMonogramme({ className = "" }: { className?: string }) {
  const { flapClass, onPointerDown, onAnimationEnd } = useFlap();
  return (
    <svg
      className={`infflunch-logo hl-bat-logo ${flapClass} ${className}`}
      viewBox="12 16 58 68"
      role="img"
      aria-label="infflunch"
      onPointerDown={onPointerDown}
      onAnimationEnd={onAnimationEnd}
    >
      <path fill="currentColor" d={MONO.fork} />
      <path fill="currentColor" d={MONO.knife} />
      <Bat x={28} y={30.4} scale={0.132} />
    </svg>
  );
}

/** Logotype d'Halloween (navbar desktop), ADMINFFLUNCH avec `admin`. */
export function BatLogotype({ className = "", admin = false }: { className?: string; admin?: boolean }) {
  const { flapClass, onPointerDown, onAnimationEnd } = useFlap();
  const letters = admin
    ? [...ADMIN_LETTERS, ...LETTERS.map((l) => ({ ...l, x: l.x + ADMIN_SHIFT }))]
    : LETTERS;
  return (
    <svg
      className={`infflunch-logo hl-bat-logo ${flapClass} ${className}`}
      viewBox={admin ? "-6 14 578 72" : "-6 14 384 72"}
      role="img"
      aria-label={admin ? "adminfflunch" : "infflunch"}
      onPointerDown={onPointerDown}
      onAnimationEnd={onAnimationEnd}
    >
      {letters.map((l) =>
        l.d.map((d, j) => (
          <path
            key={`${l.x}-${j}`}
            transform={`translate(${l.x} 0)`}
            fill={l.accent ? ORANGE : "currentColor"}
            d={d}
          />
        )),
      )}
      {/* Positions et tailles reprises des animations livrées (08 et 09). */}
      {admin ? (
        <Bat x={201.67} y={30} scale={0.1467} />
      ) : (
        <Bat x={7.818} y={30} scale={0.1364} />
      )}
    </svg>
  );
}

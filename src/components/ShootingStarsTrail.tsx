import { useEffect, useState } from "react";
import {
  isShootingStarsActive,
  subscribeShootingStars,
} from "@/lib/shootingStars";

/** Point du sillage lumineux (ruban derrière le pointeur). */
interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

/** Étincelle qui se détache du sillage. */
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  spin: number;
  life: number; // 1 → 0
  decay: number;
  color: string;
}

const SPARK_COLORS = ["#fbbf24", "#fde68a", "#ffffff", "#f59e0b"];
/** Même étoile que la note (react-icons FaStar, viewBox 576×512). */
const FA_STAR_PATH =
  "M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z";
const CURSOR_SIZE = 26; // px (largeur de l'étoile)
const CURSOR_TURN_MS = 1400; // un tour complet

/** Dernière position connue de la souris (suivie en permanence, pas cher) :
 *  permet d'afficher l'étoile-curseur dès l'activation, sans attendre un
 *  mouvement. null = pas de souris (tactile) ou hors fenêtre. */
let lastMouse: { x: number; y: number } | null = null;
const TRAIL_MS = 420; // durée de vie d'un point du ruban
const MAX_SPARKS = 160;

const drawStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number
) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
};

/** Point rééchantillonné du ruban lissé (+ facteur de vie k = 1 → 0). */
interface Sample {
  x: number;
  y: number;
  k: number;
}

/**
 * Lisse la polyligne des événements pointeur (rares et anguleux quand la souris
 * va vite) par une spline Catmull-Rom rééchantillonnée tous les ~3 px.
 */
const smoothTrail = (pts: TrailPoint[], now: number): Sample[] => {
  const out: Sample[] = [];
  const n = pts.length;
  const life = (t: number) => Math.max(0, 1 - (now - t) / TRAIL_MS);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];
    const steps = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3));
    const k1 = life(p1.t);
    const k2 = life(p2.t);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        k: k1 + (k2 - k1) * t,
      });
    }
  }
  const last = pts[n - 1];
  out.push({ x: last.x, y: last.y, k: life(last.t) });
  return out;
};

/**
 * Ruban effilé rempli d'un seul tenant (pas de segments → pas de cassures ni
 * de surbrillance aux jointures) : largeur ∝ vie du point, donc la queue
 * s'amincit jusqu'à disparaître.
 */
const drawRibbon = (
  ctx: CanvasRenderingContext2D,
  samples: Sample[],
  width: number,
  color: string,
  alpha: number
) => {
  const n = samples.length;
  if (n < 2) return;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = samples[Math.max(i - 1, 0)];
    const next = samples[Math.min(i + 1, n - 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const h = (width * samples[i].k) / 2;
    left.push(samples[i].x - dy * h, samples[i].y + dx * h);
    right.push(samples[i].x + dy * h, samples[i].y - dx * h);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(left[0], left[1]);
  for (let i = 2; i < left.length; i += 2) ctx.lineTo(left[i], left[i + 1]);
  for (let i = right.length - 2; i >= 0; i -= 2)
    ctx.lineTo(right[i], right[i + 1]);
  ctx.closePath();
  ctx.fill();
  // Tête arrondie (le remplissage seul finit en biseau).
  const head = samples[n - 1];
  ctx.beginPath();
  ctx.arc(head.x, head.y, (width * head.k) / 2, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Composant global (monté dans Wrapper) : quand l'easter egg est actif, pose la
 * classe `shooting-stars` sur <html> (curseur étoile, cf. index.css) et dessine
 * un sillage lumineux effilé + étincelles derrière le pointeur (souris ou doigt),
 * ainsi que le curseur lui-même : l'étoile de la note qui tourne sur elle-même
 * (le curseur natif est masqué en CSS ; rien de dessiné au doigt).
 * `prefers-reduced-motion` : curseur seul, pas de traînée.
 */
const ShootingStarsTrail = () => {
  const [on, setOn] = useState(isShootingStarsActive);

  useEffect(() => subscribeShootingStars(setOn), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastMouse =
        e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
    };
    const onOut = () => {
      lastMouse = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onOut);
    window.addEventListener("blur", onOut);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.documentElement.removeEventListener("mouseleave", onOut);
      window.removeEventListener("blur", onOut);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("shooting-stars", on);
    return () => document.documentElement.classList.remove("shooting-stars");
  }, [on]);

  useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => canvas.remove();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const trail: TrailPoint[] = [];
    const sparks: Spark[] = [];
    const starPath = new Path2D(FA_STAR_PATH);
    let raf = 0;
    let lastX: number | null = null;
    let lastY: number | null = null;
    // Position du curseur dessiné (souris uniquement) ; null = caché.
    let cursor: { x: number; y: number } | null = lastMouse;

    const drawCursor = (now: number) => {
      if (!cursor) return;
      const k = CURSOR_SIZE / 576;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.translate(cursor.x, cursor.y);
      ctx.rotate(((now % CURSOR_TURN_MS) / CURSOR_TURN_MS) * Math.PI * 2);
      ctx.scale(k, k);
      ctx.translate(-288, -256);
      ctx.fillStyle = "#f59e0b";
      ctx.fill(starPath);
      ctx.restore();
    };

    const spawn = (x: number, y: number) => {
      const now = performance.now();
      const fromX = lastX ?? x;
      const fromY = lastY ?? y;
      const dist = Math.hypot(x - fromX, y - fromY);
      // Points trop rapprochés (souris lente) : on rafraîchit le dernier au
      // lieu d'empiler du bruit qui casse le lissage.
      const tail = trail[trail.length - 1];
      if (tail && Math.hypot(x - tail.x, y - tail.y) < 2) {
        tail.x = x;
        tail.y = y;
        tail.t = now;
      } else {
        trail.push({ x, y, t: now });
      }
      // Étincelles proportionnelles à la vitesse : rien à l'arrêt, gerbe
      // quand le pointeur file.
      const n = Math.min(4, Math.floor(dist / 10));
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        const px = fromX + (x - fromX) * t;
        const py = fromY + (y - fromY) * t;
        // Léger recul opposé au sens du mouvement (les braises restent derrière).
        const bx = dist ? -(x - fromX) / dist : 0;
        const by = dist ? -(y - fromY) / dist : 0;
        sparks.push({
          x: px,
          y: py,
          vx: bx * 0.6 + (Math.random() - 0.5) * 1.2,
          vy: by * 0.6 + (Math.random() - 0.5) * 1.2 + 0.3,
          size: 1.5 + Math.random() * 3,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.25,
          life: 1,
          decay: 0.025 + Math.random() * 0.03,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
        });
      }
      if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
      lastX = x;
      lastY = y;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";

      // Purge des points morts du ruban
      while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();

      if (trail.length > 1) {
        // Halo large et doux, puis lueur ambre, puis cœur blanc.
        const samples = smoothTrail(trail, now);
        drawRibbon(ctx, samples, 22, "#f59e0b", 0.16);
        drawRibbon(ctx, samples, 10, "#fbbf24", 0.45);
        drawRibbon(ctx, samples, 3.5, "#fff7d6", 0.95);
        // Lueur en tête, juste derrière le curseur.
        const head = trail[trail.length - 1];
        const k = 1 - (now - head.t) / TRAIL_MS;
        if (k > 0) {
          const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 18);
          g.addColorStop(0, `rgba(255,247,214,${0.55 * k})`);
          g.addColorStop(0.5, `rgba(251,191,36,${0.25 * k})`);
          g.addColorStop(1, "rgba(251,191,36,0)");
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.vx *= 0.98;
        p.rot += p.spin;
        p.life -= p.decay;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        drawStar(ctx, p.x, p.y, p.size * (0.3 + 0.7 * p.life), p.rot);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      drawCursor(now);
      // Boucle tant qu'il y a quelque chose à animer (le curseur tourne en continu).
      raf =
        trail.length || sparks.length || cursor ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      cursor = e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
      spawn(e.clientX, e.clientY);
    };
    const onLeave = () => {
      lastX = null;
      lastY = null;
    };
    // Souris sortie de la fenêtre : on cache l'étoile-curseur.
    const onWindowLeave = () => {
      cursor = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    if (cursor) raf = requestAnimationFrame(tick); // étoile visible immédiatement
    window.addEventListener("pointerup", onLeave);
    window.addEventListener("pointercancel", onLeave);
    document.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("mouseleave", onWindowLeave);
    window.addEventListener("blur", onWindowLeave);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("mouseleave", onWindowLeave);
      window.removeEventListener("blur", onWindowLeave);
      if (raf) cancelAnimationFrame(raf);
      canvas.remove();
    };
  }, [on]);

  return null;
};

export default ShootingStarsTrail;

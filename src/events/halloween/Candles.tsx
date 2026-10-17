import type { CSSProperties } from "react";
import "./halloween.css";

/*
 * Bougies posées sur le filet du pied de page (animations 01 et 02 livrées).
 * Dessinées à leur taille d'origine (repère de 480 × 600 / 560 × 600, filet
 * à y = 500) puis réduites en CSS (--hl-s, cf. halloween.css).
 */

/** Dégradé du halo (`small` : petite flamme du duo, un peu moins vif). */
const glow = (dark: boolean, small: boolean) => {
  const [a, b] = dark ? (small ? [0.48, 0.18] : [0.55, 0.22]) : small ? [0.46, 0.19] : [0.52, 0.22];
  const [mid, end] = dark ? [35, 68] : [42, 70];
  return `radial-gradient(circle, rgba(234,88,12,${a}) 0%, rgba(234,88,12,${b}) ${mid}%, rgba(234,88,12,0) ${end}%)`;
};

type HaloProps = { x: number; y: number; size: number; dark?: boolean; small?: boolean; anim: CSSProperties };

/** Aura qui pulse autour d'une flamme (plus large et plus vive en thème sombre). */
const Halo = ({ x, y, size, dark = false, small = false, anim }: HaloProps) => (
  <div
    className={`hl-halo ${dark ? "hl-only-dark" : "hl-only-light"}`}
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: "50%",
      background: glow(dark, small),
      ...anim,
    }}
  />
);

type FlameProps = { x: number; y: number; transform: string; flame: CSSProperties; core: CSSProperties };

/** Flamme orange à cœur blanc qui vacille (agrandie par `transform`, depuis sa base). */
const Flame = ({ x, y, transform, flame, core }: FlameProps) => (
  <div
    style={{ position: "absolute", left: x, top: y, width: 48, height: 80, transform, transformOrigin: "50% 90%" }}
  >
    <div className="hl-flame" style={{ position: "absolute", left: 0, top: 0, width: 48, height: 80, ...flame }}>
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 32,
          width: 32,
          height: 32,
          borderRadius: "50% 0 50% 50%",
          transform: "scaleY(1.45) rotate(-45deg)",
          background: "#EA580C",
        }}
      />
      <div className="hl-core" style={{ position: "absolute", left: 15, top: 46, width: 18, height: 22, ...core }}>
        <div
          style={{
            position: "absolute",
            left: 2,
            top: 4,
            width: 14,
            height: 14,
            borderRadius: "50% 0 50% 50%",
            transform: "scaleY(1.35) rotate(-45deg)",
            background: "#FFFFFF",
          }}
        />
      </div>
    </div>
  </div>
);

const WAX = "#5478D4";

/** Bougie seule (01). */
const Candle = () => (
  <div className="hl-canvas hl-candle" style={{ width: 480, height: 600 }}>
    <Halo x={87} y={27} size={320} anim={{ animationDuration: "3.2s" }} />
    <Halo x={27} y={-33} size={440} dark anim={{ animationDuration: "3.2s" }} />
    <svg width="480" height="600" viewBox="0 0 480 600" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path className="hl-body" d="M184 266 C190 252 214 250 230 254 C240 257 250 250 262 249 C280 248 296 252 298 262 C296 300 302 340 300 380 C301 430 303 470 306 500 L176 500 C179 470 182 430 182 380 C181 330 186 300 184 266 Z" />
      <path fill={WAX} d="M182 268 C186 250 214 246 232 252 C244 256 252 246 266 246 C284 246 300 252 300 264 C302 290 304 330 303 380 C302 430 308 470 310 494 C311 500 300 502 298 496 C296 470 292 440 291 400 C290 380 286 372 282 380 C279 400 282 420 276 428 C270 436 262 430 263 420 C264 380 262 320 256 300 C252 292 248 294 247 304 C246 316 249 326 242 330 C236 333 232 326 234 316 C236 300 232 292 226 296 C220 300 222 330 222 350 C222 372 226 386 216 390 C206 393 204 382 207 370 C210 340 206 300 198 296 C192 293 192 310 190 322 C188 336 184 344 178 338 C172 332 176 316 177 300 C178 288 179 276 182 268 Z" />
      <ellipse className="hl-body" cx="244" cy="255" rx="30" ry="6" transform="rotate(-4 244 255)" />
      <path fill={WAX} d="M158 500 C158 494 166 492 176 494 C220 490 300 492 330 493 C360 493 392 494 396 499 C398 504 392 506 384 506 C380 506 378 512 378 520 C378 528 368 530 368 520 C368 512 364 506 352 506 C346 506 344 520 344 534 C344 546 332 546 332 534 C332 520 330 506 318 506 C314 506 314 540 312 560 C311 572 296 572 296 560 C296 540 296 510 286 506 C260 506 230 506 226 508 C224 512 226 518 220 520 C214 521 212 514 212 508 C200 506 186 506 184 512 C182 524 180 530 174 530 C168 530 166 522 168 512 C164 506 158 506 158 500 Z" />
      <path className="hl-wick" fill="none" strokeWidth="4" strokeLinecap="round" d="M244 255 C243 246 244 238 248 230" />
    </svg>
    <Flame
      x={223}
      y={160}
      transform="rotate(4deg) scale(1.5)"
      flame={{ animationDuration: "1.6s" }}
      core={{ animationDuration: "1.6s" }}
    />
  </div>
);

/** Duo de bougies (02) : rythmes désynchronisés, cires réunies sur le filet. */
const CandleDuo = () => (
  <div className="hl-canvas hl-duo" style={{ width: 560, height: 600 }}>
    <Halo x={57} y={27} size={320} anim={{ animationDuration: "3.7s", animationDelay: "-0.5s" }} />
    <Halo x={-3} y={-33} size={440} dark anim={{ animationDuration: "3.7s", animationDelay: "-0.5s" }} />
    <Halo x={247} y={196} size={220} small anim={{ animationDuration: "2.9s", animationDelay: "-1.7s" }} />
    <Halo x={207} y={156} size={300} dark small anim={{ animationDuration: "2.9s", animationDelay: "-1.7s" }} />
    <svg width="560" height="600" viewBox="0 0 560 600" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g transform="translate(-30 0)">
        <path className="hl-body" d="M184 266 C190 252 214 250 230 254 C240 257 250 250 262 249 C280 248 296 252 298 262 C296 300 302 340 300 380 C301 430 303 470 306 500 L176 500 C179 470 182 430 182 380 C181 330 186 300 184 266 Z" />
        <path fill={WAX} d="M180 264 C182 252 206 246 226 250 C240 253 250 246 264 247 C284 248 300 254 300 266 C302 280 306 296 302 306 C298 314 290 310 291 300 C292 290 288 284 284 290 C280 298 282 330 280 352 C279 368 268 370 268 356 C268 330 266 300 258 296 C252 294 252 306 250 316 C248 324 240 324 240 314 C240 302 236 294 230 298 C224 302 226 340 226 380 C226 420 230 440 222 452 C214 462 208 452 210 440 C212 420 210 360 206 320 C204 304 200 298 196 302 C192 306 190 330 189 380 C188 430 186 470 186 494 C186 500 176 502 174 496 C172 470 175 430 177 380 C178 330 176 300 178 280 C178 274 179 268 180 264 Z" />
        <ellipse className="hl-body" cx="244" cy="255" rx="30" ry="6" transform="rotate(4 244 255)" />
        <path fill={WAX} d="M150 500 C150 494 160 492 172 494 C220 490 300 492 330 493 C350 493 372 494 376 499 C378 504 370 506 362 506 C356 506 352 512 352 520 C352 528 340 528 340 520 C340 512 336 506 326 506 C300 506 280 506 274 508 C272 514 274 524 272 534 C270 544 258 544 260 534 C262 524 262 512 254 507 C240 506 232 506 228 508 C226 512 228 518 222 520 C216 521 214 514 214 508 C206 506 196 506 192 512 C190 530 192 548 190 560 C189 572 174 572 174 560 C174 544 176 520 170 508 C160 506 150 506 150 500 Z" />
        <path className="hl-wick" fill="none" strokeWidth="4" strokeLinecap="round" d="M244 255 C243 246 244 238 248 230" />
      </g>
      <path className="hl-body" d="M320 376 C326 366 344 364 356 367 C364 369 372 363 382 363 C394 363 402 368 402 376 C401 410 404 450 405 500 L316 500 C318 450 320 410 320 376 Z" />
      <path fill={WAX} d="M318 378 C322 364 342 360 358 365 C366 368 374 360 384 360 C398 360 404 366 404 376 C405 392 406 410 405 424 C404 434 394 436 394 426 C394 412 392 400 386 400 C380 400 380 430 379 460 C378 480 381 494 382 500 L365 500 C366 490 367 470 366 450 C366 420 366 404 360 400 C354 397 352 408 350 414 C348 422 340 424 340 414 C340 404 338 396 332 396 C326 396 326 412 324 424 C322 436 312 436 314 424 C315 410 316 392 318 378 Z" />
      <ellipse className="hl-body" cx="361" cy="370" rx="22" ry="5" transform="rotate(3 361 370)" />
      <path fill={WAX} d="M306 500 C306 495 314 493 324 494 C360 492 400 493 414 495 C422 497 422 505 414 506 C408 506 406 512 406 522 C406 532 394 532 394 522 C394 512 392 506 380 506 C360 506 340 506 334 507 C330 510 332 516 326 518 C320 519 318 512 318 508 C312 506 306 506 306 500 Z" />
      <path className="hl-wick" fill="none" strokeWidth="4" strokeLinecap="round" d="M361 370 C361 362 360 356 357 349" />
    </svg>
    <Flame
      x={193}
      y={160}
      transform="rotate(4deg) scale(1.5)"
      flame={{ animationDuration: "1.83s", animationDelay: "-0.4s" }}
      core={{ animationDuration: "1.57s", animationDelay: "-1.1s" }}
    />
    <Flame
      x={333}
      y={277}
      transform="rotate(-4deg) scale(1.17)"
      flame={{ animationDuration: "1.37s", animationDelay: "-0.9s" }}
      core={{ animationDuration: "1.21s", animationDelay: "-0.3s" }}
    />
  </div>
);

/** Décor du pied de page : bougie seule à gauche, duo à droite. (Plus de
 *  citrouille : la citrouille-panier pleine est le trophée de la chasse aux
 *  bonbons.) */
export default function Candles() {
  return (
    <div className="hl-candles">
      <div aria-hidden="true" className="hl-anchor hl-anchor-left">
        <Candle />
      </div>
      <div aria-hidden="true" className="hl-anchor hl-anchor-right">
        <CandleDuo />
      </div>
    </div>
  );
}

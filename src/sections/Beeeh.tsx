import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";

/** Emojis liés à la nourriture (hors fruits) qui tombent. */
const FOOD_EMOJIS = [
  // Pains & boulangerie
  "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇",
  // Plats & protéines
  "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🥘", "🍲", "🥗",
  // Cuisine asiatique
  "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡",
  // Desserts & sucreries
  "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯",
];

/** Largeur utile = largeur du layout (max 1200px, centrée) pour rester attrapable. */
const LAYOUT_MAX = 1200;
const EMOJI_SIZE = 40;
const MAX_EMOJIS = 30;

type FallingItem = { id: number; emoji: string; left: number; duration: number };

const Beeeh = () => {
  const beehRef = useRef<HTMLAudioElement | null>(null);
  const eatRef = useRef<HTMLAudioElement | null>(null);
  const controls = useAnimation();
  const idRef = useRef(0);
  const wobblingRef = useRef(false);
  const [items, setItems] = useState<FallingItem[]>([]);

  const spawnEmoji = useCallback(() => {
    const layoutW = Math.min(window.innerWidth, LAYOUT_MAX);
    const margin = (window.innerWidth - layoutW) / 2;
    const left = margin + Math.random() * Math.max(0, layoutW - EMOJI_SIZE);
    const next: FallingItem = {
      id: idRef.current++,
      emoji: FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)],
      left,
      duration: 6 + Math.random() * 2,
    };
    // Plafond de 10 emojis : au-delà on ne spawn plus, le temps que ceux en
    // chute disparaissent.
    setItems((prev) => (prev.length >= MAX_EMOJIS ? prev : [...prev, next]));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const play = (ref: React.MutableRefObject<HTMLAudioElement | null>, src: string) => {
    if (!ref.current) ref.current = new Audio(src);
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {});
  };

  // Clic sur le mouton : beeeh + dandinement + un emoji tombe.
  // Ignoré tant que le dandinement précédent n'est pas fini (anti-spam) :
  // pas de son ni de spawn sur un clic invalide.
  const handleSheepClick = async () => {
    if (wobblingRef.current) return;
    wobblingRef.current = true;
    play(beehRef, "/beeeh.mp3");
    spawnEmoji();
    await controls.start({
      rotate: [0, 5, -5, 5, -5, 0],
      transition: { duration: 1 },
    });
    wobblingRef.current = false;
  };

  // Clic sur un emoji en chute : il disparaît, son de croquage, le mouton "mange".
  const handleEatEmoji = (id: number) => {
    removeItem(id);
    play(eatRef, "/eat.mp3");
    controls.start({
      scaleY: [1, 0.82, 1.12, 0.85, 1.1, 0.88, 1.06, 1],
      scaleX: [1, 1.12, 0.94, 1.1, 0.95, 1.08, 0.97, 1],
      transition: { duration: 0.9, ease: "easeInOut" },
    });
  };

  const handleImageLoad = () => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    });
  };

  return (
    <div className="tw-scope flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <motion.img
        src="/beeeh.jpg"
        alt="BeeeH"
        className="max-h-[min(300px,40vh)] w-auto cursor-pointer rounded-lg shadow-lg"
        style={{ transformOrigin: "bottom center" }}
        initial={{ opacity: 0, y: -100 }}
        animate={controls}
        onClick={handleSheepClick}
        onLoad={handleImageLoad}
      />

      <div>
        <p className="text-2xl font-bold text-foreground">🐑 BEEEEH !</p>
        <p className="text-foreground/60">Rien à brouter par ici</p>
      </div>

      {/* Pluie d'emojis : devant le mouton (z-900), derrière la navbar (z-1000). */}
      <div className="pointer-events-none fixed inset-0 z-[900] overflow-hidden">
        <AnimatePresence>
          {items.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              aria-label={`Manger ${item.emoji}`}
              className="pointer-events-auto absolute top-0 cursor-pointer select-none border-0 bg-transparent p-0 leading-none"
              style={{ left: item.left, fontSize: EMOJI_SIZE }}
              initial={{ y: 0, rotate: 0, opacity: 1 }}
              animate={{
                y: "100vh",
                rotate: [0, 360, 720],
                transition: {
                  y: { duration: item.duration, ease: "linear" },
                  rotate: { duration: item.duration, ease: "linear" },
                },
              }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
              onClick={() => handleEatEmoji(item.id)}
              onAnimationComplete={() => removeItem(item.id)}
            >
              {item.emoji}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Beeeh;

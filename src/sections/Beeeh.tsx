import { motion, useAnimation } from "framer-motion";
import { useRef } from "react";

const Beeeh = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const controls = useAnimation();

  const handleClick = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/beeeh.mp3");
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

    await controls.start({
      rotate: [0, 5, -5, 5, -5, 0],
      transition: { duration: 1 },
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
    <div className="tw-scope flex flex-col items-center justify-center gap-6 p-8 text-center">
      <motion.img
        src="/beeeh.jpg"
        alt="BeeeH"
        className="max-h-[300px] cursor-pointer rounded-lg shadow-lg"
        initial={{ opacity: 0, y: -100 }}
        animate={controls}
        onClick={handleClick}
        onLoad={handleImageLoad}
      />

      <div>
        <p className="text-2xl font-bold text-foreground">🐑 BEEEEH !</p>
        <p className="text-foreground/60">Rien à voir par ici...</p>
      </div>
    </div>
  );
};

export default Beeeh;

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/Roulette.css';

const ACTIONS = ['ВЗЛОМАЛ СИСТЕМУ', 'ЗАБРАЛ КУШ', 'АКТИВИРОВАЛ КОД', 'ОБОШЕЛ ЗАЩИТУ', 'ВЫВЕЛ СРЕДСТВА'];
const ASSETS = ['ДИПЛОМ ПОД КЛЮЧ', 'СКИДКА -90%', 'PREMIUM ДОСТУП', 'БАЗА ДАННЫХ', 'VIP СТАТУС'];
const NAMES = ['ALEX_M', 'DIMITRI_K', 'GHOST_01', 'CYBER_V', 'KATYA_R', 'SYSTEM_ADMIN', 'ZERO_COOL', 'NEO_X'];

export const LiveWinnersTicker = () => {
  // We duplicate the content to ensure seamless infinite scroll
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const generateBatch = () => Array.from({ length: 10 }).map(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
      return `${name} :: ${action} :: ${asset}`;
    });
    setItems([...generateBatch(), ...generateBatch()]); // Double for loop
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full bg-[#09090b] border-b border-[#D4AF37]/30 z-40 overflow-hidden h-10 flex items-center shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
      {/* Gradient overlay for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#09090b] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#09090b] to-transparent z-10 pointer-events-none"></div>

      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzQx/giphy.gif')] opacity-5 pointer-events-none mix-blend-overlay"></div>

      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, -1000] }} // Adjust based on content width, or use percentage if possible but pixels are smoother for text
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 20,
            ease: "linear",
          }
        }}
      >
        {items.map((entry, i) => (
          <div key={i} className="flex items-center mx-6">
            <span className="w-2 h-2 bg-[#0F0] rounded-full animate-pulse mr-2 shadow-[0_0_5px_#0F0]"></span>
            <span className="text-xs font-mono font-bold tracking-widest text-[#D4AF37] opacity-90 hover:opacity-100 hover:text-[#FBF5B7] transition-colors cursor-default uppercase">
              {entry}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};


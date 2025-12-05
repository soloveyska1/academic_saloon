import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Roulette.css';

interface PrizeTickerProps {
  highlightId: string | null;
  state: 'idle' | 'spinning' | 'near-miss' | 'landed' | 'failed';
}

const PRIZES = [
  { id: 'dip', label: 'ДИПЛОМ ПОД КЛЮЧ', rarity: 'LEGENDARY', color: 'text-[#FFD700]' },
  { id: 'crs', label: 'КУРСОВАЯ РАБОТА', rarity: 'EPIC', color: 'text-[#C0C0C0]' },
  { id: 'dsc', label: 'СКИДКА -500₽', rarity: 'RARE', color: 'text-[#D4AF37]' },
  { id: 'pre', label: 'PREMIUM ОТЧЕТ', rarity: 'EPIC', color: 'text-[#C0C0C0]' },
  { id: 'vip', label: 'VIP СТАТУС', rarity: 'LEGENDARY', color: 'text-[#FFD700]' },
  { id: 'bon', label: 'БОНУС 1000₽', rarity: 'RARE', color: 'text-[#D4AF37]' },
];

export const PrizeTicker = ({ highlightId, state }: PrizeTickerProps) => {
  const [displayPrizes, setDisplayPrizes] = useState(PRIZES);

  // Slot machine effect: rapidly cycle prizes
  useEffect(() => {
    if (state === 'spinning') {
      const interval = setInterval(() => {
        setDisplayPrizes(prev => {
          const next = [...prev];
          const first = next.shift();
          if (first) next.push(first);
          return next;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [state]);

  const targetPrize = PRIZES.find(p => p.id === highlightId);

  return (
    <div className="relative w-full max-w-sm mx-auto mt-8 mb-4 h-32 overflow-hidden border-y-2 border-[#D4AF37]/30 bg-black/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.8)]">
      <div className="absolute top-1 left-2 text-[10px] font-mono tracking-widest text-[#D4AF37]/50 z-10">TARGET SELECTOR_V2.0</div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#D4AF37]"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#D4AF37]"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#D4AF37]"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#D4AF37]"></div>

      <div className="relative h-full flex flex-col items-center justify-center">
        {/* Selection Highlight Bar */}
        <div className="absolute w-full h-10 bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent border-y border-[#D4AF37]/20 z-0"></div>

        <AnimatePresence mode='wait'>
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[#D4AF37]/40 text-sm font-mono tracking-[0.2em] animate-pulse"
            >
              WAITING FOR INPUT...
            </motion.div>
          )}

          {state === 'spinning' && (
            <div className="flex flex-col items-center gap-2 z-10 blur-[1px]">
              {displayPrizes.slice(0, 3).map((p, i) => (
                <div key={`${p.id}-${i}`} className={`text-sm font-bold tracking-widest ${i === 1 ? 'text-[#D4AF37] scale-110' : 'text-gray-600'}`}>
                  {p.label}
                </div>
              ))}
            </div>
          )}

          {state === 'near-miss' && (
            <motion.div
              key="near-miss"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              className="z-10 text-center"
            >
              <div className="text-[#FF3B30] text-lg font-bold tracking-widest glitched-text shaking">
                [ {PRIZES[0].label} ]
              </div>
              <div className="text-[10px] text-[#FF3B30] font-mono mt-1">ERROR: ENCRYPTION TOO STRONG</div>
            </motion.div>
          )}

          {state === 'landed' && targetPrize && (
            <motion.div
              key="landed"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1.2, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="z-10 text-center"
            >
              <div className={`text-xl font-black tracking-widest metallic-text drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]`}>
                {targetPrize.label}
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-[1px] bg-[#0F0] mt-2 shadow-[0_0_5px_#0F0]"
              />
              <div className="text-[10px] text-[#0F0] font-mono mt-1 tracking-[0.3em] uppercase">
                Vulnerability Found
              </div>
            </motion.div>
          )}

          {state === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-500 font-mono tracking-widest"
            >
              SYSTEM LOCKDOWN
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuNCkiIC8+Cjwvc3ZnPg==')] opacity-30 mix-blend-overlay"></div>
    </div>
  );
};

<<<<<<< HEAD
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
=======
import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  ХАКЕРЫ TICKER — Fake Social Proof (Russian)
//  Format: [ИМЯ] :: [ДЕЙСТВИЕ] :: [АКТИВ]
// ═══════════════════════════════════════════════════════════════════════════

interface Hacker {
  name: string
  action: string
  asset: string
}

const FAKE_HACKERS: Hacker[] = [
  { name: 'АЛЕКСЕЙ М.', action: 'ВЗЛОМАЛ', asset: 'ДИПЛОМ' },
  { name: 'ЕЛЕНА К.', action: 'ПОЛУЧИЛА', asset: '-500₽' },
  { name: 'ДМИТРИЙ В.', action: 'ВЗЛОМАЛ', asset: 'КУРСОВАЯ' },
  { name: 'МАРИЯ С.', action: 'ЗАБРАЛА', asset: '-500₽' },
  { name: 'КИРИЛЛ Р.', action: 'АКТИВИРОВАЛ', asset: 'ЭССЕ' },
  { name: 'АННА П.', action: 'ПОЛУЧИЛА', asset: '-200₽' },
  { name: 'АРТЁМ Н.', action: 'ВЗЛОМАЛ', asset: 'КОНСУЛЬТАЦИЯ' },
  { name: 'ОЛЬГА Т.', action: 'ЗАБРАЛА', asset: '-500₽' },
  { name: 'ИВАН К.', action: 'АКТИВИРОВАЛ', asset: '-200₽' },
  { name: 'ЮЛИЯ М.', action: 'ПОЛУЧИЛА', asset: 'ЭССЕ' },
]

export const LiveWinnersTicker = memo(() => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FAKE_HACKERS.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  const hacker = FAKE_HACKERS[index]

  return (
    <div
      style={{
        height: 30,
        flexShrink: 0,
        background: '#050505',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.03), transparent)',
          animation: 'tickerScroll 3s linear infinite',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 9,
            fontFamily: 'var(--font-hack, "JetBrains Mono", monospace)',
            letterSpacing: '0.12em',
          }}
        >
          {/* Pulse indicator */}
          <Zap
            size={10}
            fill="#D4AF37"
            color="#D4AF37"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.6))',
            }}
          />

          {/* Name */}
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {hacker.name}
          </span>

          {/* Separator */}
          <span style={{ color: 'rgba(212, 175, 55, 0.4)' }}>::</span>

          {/* Action */}
          <span style={{ color: '#D4AF37', fontWeight: 700 }}>
            {hacker.action}
          </span>

          {/* Separator */}
          <span style={{ color: 'rgba(212, 175, 55, 0.4)' }}>::</span>

          {/* Asset */}
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              textShadow: '0 0 8px rgba(212, 175, 55, 0.5)',
            }}
          >
            {hacker.asset}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
})
>>>>>>> origin/main


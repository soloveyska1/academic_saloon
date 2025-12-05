<<<<<<< HEAD
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
=======
import { memo } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  АКТИВЫ TICKER — Compact Asset List (FORCED DARK)
//  NO PROBABILITIES - Use rarity badges instead
//  Shows only 3-4 items, compact vertical stack
// ═══════════════════════════════════════════════════════════════════════════

export type AssetRarity = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

export interface Asset {
  id: string
  name: string           // Russian name
  value: string          // Value display
  rarity: AssetRarity    // Rarity badge
  icon: LucideIcon
}

interface PrizeTickerProps {
  assets: Asset[]
  activeId: string | null
}

const RARITY_CONFIG: Record<AssetRarity, { label: string; class: string }> = {
  mythic: { label: 'МИФИЧЕСКИЙ', class: 'badge-mythic' },
  legendary: { label: 'ЛЕГЕНДАРНЫЙ', class: 'badge-legendary' },
  epic: { label: 'ЭПИЧЕСКИЙ', class: 'badge-epic' },
  rare: { label: 'РЕДКИЙ', class: 'badge-rare' },
  common: { label: 'ОБЫЧНЫЙ', class: 'badge-common' },
}

export const PrizeTicker = memo(({ assets, activeId }: PrizeTickerProps) => {
  // Show only first 4 assets to keep compact
  const visibleAssets = assets.slice(0, 4)

  return (
    <div
      style={{
        flex: '0 0 auto',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 6,
          borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-hack, monospace)',
            color: '#D4AF37',
            letterSpacing: '0.2em',
          }}
        >
          ДОСТУПНЫЕ АКТИВЫ
        </span>
        <span
          style={{
            fontSize: 8,
            fontFamily: 'var(--font-hack, monospace)',
            color: '#444',
            letterSpacing: '0.1em',
          }}
        >
          LIVE
        </span>
      </div>

      {/* Asset List */}
      {visibleAssets.map((asset, index) => {
        const isActive = activeId === asset.id
        const isPassed = activeId !== null &&
          assets.findIndex(a => a.id === activeId) > index
        const rarity = RARITY_CONFIG[asset.rarity]
        const Icon = asset.icon

        return (
          <motion.div
            key={asset.id}
            animate={{
              scale: isActive ? 1.02 : 1,
              opacity: isPassed ? 0.3 : 1,
            }}
            transition={{ duration: 0.12 }}
            className={isActive ? 'asset-glow-active' : ''}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: isActive
                ? 'rgba(212, 175, 55, 0.08)'
                : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${isActive ? '#D4AF37' : 'rgba(255,255,255,0.04)'}`,
              overflow: 'hidden',
            }}
          >
            {/* Active glow bar */}
            {isActive && (
              <motion.div
                layoutId="assetGlow"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: '#D4AF37',
                  boxShadow: '0 0 12px #D4AF37',
                }}
              />
            )}

            {/* Icon */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: isActive
                  ? 'linear-gradient(135deg, #D4AF37, #8b6914)'
                  : '#111115',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive
                  ? '0 0 15px rgba(212, 175, 55, 0.4)'
                  : 'none',
              }}
            >
              <Icon
                size={16}
                color={isActive ? '#050505' : '#555'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
            </div>

            {/* Name & Value */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-elite, Georgia, serif)',
                  fontWeight: 600,
                  color: isActive ? '#fff' : '#888',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {asset.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-hack, monospace)',
                  fontWeight: 700,
                  color: isActive ? '#D4AF37' : '#555',
                  textShadow: isActive
                    ? '0 0 10px rgba(212, 175, 55, 0.5)'
                    : 'none',
                }}
              >
                {asset.value}
              </div>
            </div>

            {/* Rarity Badge */}
            <div
              className={rarity.class}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 7,
                fontFamily: 'var(--font-hack, monospace)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
              }}
            >
              {rarity.label}
            </div>
          </motion.div>
        )
      })}

      {/* More indicator if there are hidden assets */}
      {assets.length > 4 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 8,
            color: '#444',
            fontFamily: 'var(--font-hack, monospace)',
            letterSpacing: '0.1em',
            padding: '4px 0',
          }}
        >
          +{assets.length - 4} СКРЫТЫХ АКТИВОВ
        </div>
      )}
    </div>
  )
})
>>>>>>> origin/main


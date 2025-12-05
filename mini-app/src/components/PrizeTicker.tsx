import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface PrizeTickerProps {
  highlightId: string | null;
}

const PRIZES = [
  {
    id: 'dip',
    label: 'ДИПЛОМНАЯ РАБОТА',
    sublabel: 'Полное написание',
    rarity: 'legendary',
    chance: '0.1%',
    icon: '👑',
  },
  {
    id: 'dsc',
    label: 'СКИДКА 50%',
    sublabel: 'На любой заказ',
    rarity: 'epic',
    chance: '0.5%',
    icon: '💎',
  },
  {
    id: 'bon',
    label: '200 БОНУСОВ',
    sublabel: 'На баланс',
    rarity: 'rare',
    chance: '5%',
    icon: '✨',
  },
  {
    id: 'min',
    label: '50 БОНУСОВ',
    sublabel: 'На баланс',
    rarity: 'common',
    chance: '20%',
    icon: '⭐',
  },
  {
    id: 'off',
    label: 'СКИДКА 5%',
    sublabel: 'На следующий заказ',
    rarity: 'common',
    chance: '25%',
    icon: '🎯',
  },
];

// Rarity color mapping
const rarityColors = {
  legendary: {
    accent: 'var(--r-legendary)',
    glow: 'rgba(255, 107, 53, 0.4)',
    bg: 'rgba(255, 107, 53, 0.08)',
  },
  epic: {
    accent: 'var(--r-gold-300)',
    glow: 'rgba(212, 175, 55, 0.3)',
    bg: 'rgba(212, 175, 55, 0.05)',
  },
  rare: {
    accent: 'var(--r-gold-400)',
    glow: 'rgba(197, 160, 40, 0.25)',
    bg: 'rgba(197, 160, 40, 0.04)',
  },
  common: {
    accent: 'var(--r-gold-600)',
    glow: 'rgba(139, 105, 20, 0.2)',
    bg: 'rgba(139, 105, 20, 0.03)',
  },
};

// Liquid Motion spring configuration
const liquidSpring = {
  type: 'spring',
  stiffness: 80,
  damping: 20,
  mass: 1,
};

export const PrizeTicker = ({ highlightId }: PrizeTickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={containerRef}
      className="w-full flex flex-col gap-5 p-4 pb-32"
    >
      {PRIZES.map((prize, index) => {
        const isHighlighted = highlightId === prize.id;
        const colors = rarityColors[prize.rarity as keyof typeof rarityColors];

        return (
          <motion.div
            key={prize.id}
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={
              isInView
                ? {
                    opacity: 1,
                    y: 0,
                    scale: isHighlighted ? 1.02 : 1,
                  }
                : {}
            }
            transition={{
              ...liquidSpring,
              delay: index * 0.12,
            }}
            className="relative"
          >
            {/* ═══════════════════════════════════════════════════════════════════════
                GLASS SLAB — Thick Frosted Glass Board
                ═══════════════════════════════════════════════════════════════════════ */}

            <motion.div
              className={`
                glass-slab gold-edge relative p-5 rounded-2xl
                transition-all duration-500
              `}
              animate={
                isHighlighted
                  ? {
                      boxShadow: `0 0 40px ${colors.glow}, 0 20px 60px rgba(0, 0, 0, 0.4)`,
                    }
                  : {}
              }
              style={{
                background: isHighlighted
                  ? `linear-gradient(135deg, ${colors.bg} 0%, var(--r-glass-bg) 50%, ${colors.bg} 100%)`
                  : undefined,
              }}
            >
              {/* Left Accent Bar — Polished Edge */}
              <div
                className="absolute left-0 top-3 bottom-3 w-1.5 rounded-l-2xl"
                style={{
                  background: `linear-gradient(180deg, ${colors.accent} 0%, transparent 50%, ${colors.accent} 100%)`,
                  boxShadow: `0 0 12px ${colors.glow}`,
                }}
              />

              {/* Content Container */}
              <div className="flex items-center justify-between pl-4">
                {/* Left: Icon + Text */}
                <div className="flex items-center gap-4">
                  {/* Icon Badge */}
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                    style={{
                      background: `linear-gradient(135deg, var(--r-bg-deep) 0%, var(--r-bg-elevated) 100%)`,
                      boxShadow: `inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)`,
                      border: `1px solid ${colors.accent}`,
                    }}
                    animate={
                      isHighlighted
                        ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 20px ${colors.glow}`,
                              `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 30px ${colors.glow}`,
                              `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 20px ${colors.glow}`,
                            ],
                          }
                        : {}
                    }
                    transition={{
                      duration: 1.5,
                      repeat: isHighlighted ? Infinity : 0,
                    }}
                  >
                    <span className="text-xl filter drop-shadow-sm">
                      {prize.icon}
                    </span>
                  </motion.div>

                  {/* Text Content */}
                  <div className="flex flex-col gap-0.5">
                    {/* Main Label — Laser-Etched */}
                    <span className="text-sm font-serif font-bold tracking-[0.1em] laser-etched">
                      {prize.label}
                    </span>

                    {/* Sublabel */}
                    <span className="text-[10px] font-sans text-[var(--r-text-muted)] tracking-wider">
                      {prize.sublabel}
                    </span>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 mt-1">
                      {/* Rarity Badge */}
                      <span
                        className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          color: colors.accent,
                          background: colors.bg,
                          border: `1px solid ${colors.accent}`,
                        }}
                      >
                        {prize.rarity === 'legendary' && 'ЛЕГЕНДА'}
                        {prize.rarity === 'epic' && 'ЭПИК'}
                        {prize.rarity === 'rare' && 'РЕДКИЙ'}
                        {prize.rarity === 'common' && 'ОБЫЧНЫЙ'}
                      </span>

                      {/* Chance */}
                      <span className="text-[9px] font-mono text-[var(--r-text-secondary)]">
                        {prize.chance}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Indicator */}
                <div className="flex flex-col items-center gap-2">
                  {/* Status Dot */}
                  <motion.div
                    className="w-3 h-3 rounded-full relative"
                    style={{
                      background: isHighlighted
                        ? `radial-gradient(circle, var(--r-success) 0%, transparent 100%)`
                        : `radial-gradient(circle, var(--r-gold-700) 0%, transparent 100%)`,
                      boxShadow: isHighlighted
                        ? '0 0 12px rgba(16, 185, 129, 0.8)'
                        : 'none',
                    }}
                    animate={
                      isHighlighted
                        ? {
                            scale: [1, 1.3, 1],
                            opacity: [0.8, 1, 0.8],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                    }}
                  >
                    {/* Inner Dot */}
                    <div
                      className="absolute inset-1 rounded-full"
                      style={{
                        background: isHighlighted
                          ? 'var(--r-success)'
                          : 'var(--r-gold-600)',
                      }}
                    />
                  </motion.div>

                  {/* Indicator Lines */}
                  <div className="flex flex-col gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-4 h-px rounded-full"
                        style={{
                          background: isHighlighted
                            ? colors.accent
                            : 'var(--r-gold-800)',
                        }}
                        animate={
                          isHighlighted
                            ? {
                                opacity: [0.3, 1, 0.3],
                                scaleX: [0.5, 1, 0.5],
                              }
                            : {}
                        }
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Highlight Glow Overlay */}
              {isHighlighted && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${colors.glow} 0%, transparent 60%)`,
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        );
      })}

      {/* Bottom Spacer with Decorative Element */}
      <div className="flex items-center justify-center gap-4 mt-6 opacity-40">
        <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--r-gold-600)]" />
        <div className="w-1.5 h-1.5 rotate-45 border border-[var(--r-gold-600)]" />
        <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--r-gold-600)]" />
      </div>
    </motion.div>
  );
};

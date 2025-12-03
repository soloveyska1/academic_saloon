import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Crosshair, Zap, Gift, Star, Sparkles, Minus, Plus, Target } from 'lucide-react'
import { UserData, RouletteResult } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { spinRoulette } from '../api/userApi'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRIZE SEGMENTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SEGMENTS = [
  { label: '5%', type: 'discount', color: '#d4af37', secondaryColor: '#8b6914' },
  { label: '50₽', type: 'bonus', color: '#3a3a40', secondaryColor: '#2a2a2e' },
  { label: 'Удача', type: 'nothing', color: '#1a1a1e', secondaryColor: '#101012' },
  { label: '100₽', type: 'bonus', color: '#d4af37', secondaryColor: '#8b6914' },
  { label: '10%', type: 'discount', color: '#3a3a40', secondaryColor: '#2a2a2e' },
  { label: 'Пусто', type: 'nothing', color: '#1a1a1e', secondaryColor: '#101012' },
  { label: '200₽', type: 'jackpot', color: '#d4af37', secondaryColor: '#8b6914' },
  { label: 'Шанс', type: 'nothing', color: '#3a3a40', secondaryColor: '#2a2a2e' },
]

const SEGMENT_ANGLE = 360 / SEGMENTS.length // 45 degrees per segment

// ═══════════════════════════════════════════════════════════════════════════
//  BET SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function BetSelector({
  betAmount,
  onBetChange,
  disabled
}: {
  betAmount: number
  onBetChange: (amount: number) => void
  disabled: boolean
}) {
  const betOptions = [50, 100, 200, 500]
  const currentIndex = betOptions.indexOf(betAmount)

  const decreaseBet = () => {
    if (currentIndex > 0 && !disabled) {
      onBetChange(betOptions[currentIndex - 1])
    }
  }

  const increaseBet = () => {
    if (currentIndex < betOptions.length - 1 && !disabled) {
      onBetChange(betOptions[currentIndex + 1])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '16px 24px',
        background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.9) 0%, rgba(10, 10, 12, 0.95) 100%)',
        borderRadius: 16,
        border: '1px solid rgba(212, 175, 55, 0.2)',
        boxShadow: `
          0 8px 32px -8px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.03)
        `,
      }}
    >
      {/* Decrease Button */}
      <motion.button
        onClick={decreaseBet}
        disabled={currentIndex === 0 || disabled}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: currentIndex === 0 || disabled
            ? 'rgba(40, 40, 45, 0.5)'
            : 'linear-gradient(135deg, #3a3a40 0%, #2a2a2e 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentIndex === 0 || disabled ? 'not-allowed' : 'pointer',
          opacity: currentIndex === 0 || disabled ? 0.4 : 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <Minus size={20} color="var(--text-secondary)" />
      </motion.button>

      {/* Bet Display */}
      <div
        style={{
          minWidth: 140,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            marginBottom: 4,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Ставка
        </div>
        <motion.div
          key={betAmount}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #f5d061, #d4af37, #b48e26)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 40px rgba(212, 175, 55, 0.3)',
          }}
        >
          {betAmount}₽
        </motion.div>
      </div>

      {/* Increase Button */}
      <motion.button
        onClick={increaseBet}
        disabled={currentIndex === betOptions.length - 1 || disabled}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: currentIndex === betOptions.length - 1 || disabled
            ? 'rgba(40, 40, 45, 0.5)'
            : 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentIndex === betOptions.length - 1 || disabled ? 'not-allowed' : 'pointer',
          opacity: currentIndex === betOptions.length - 1 || disabled ? 0.4 : 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(212, 175, 55, 0.2)',
        }}
      >
        <Plus size={20} color="var(--bg-void)" />
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS COVER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function GlassCover() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: -4,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Glass reflection layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.12) 0%,
              rgba(255, 255, 255, 0.05) 20%,
              transparent 50%,
              rgba(0, 0, 0, 0.1) 80%,
              rgba(0, 0, 0, 0.2) 100%
            )
          `,
          boxShadow: `
            inset 0 2px 4px rgba(255, 255, 255, 0.15),
            inset 0 -2px 8px rgba(0, 0, 0, 0.2)
          `,
        }}
      />

      {/* Highlight arc */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '15%',
          width: '35%',
          height: '20%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
          filter: 'blur(8px)',
          transform: 'rotate(-30deg)',
        }}
      />

      {/* Secondary highlight */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '20%',
          width: '25%',
          height: '12%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          filter: 'blur(4px)',
          transform: 'rotate(-25deg)',
        }}
      />

      {/* Edge rim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `
            0 0 20px rgba(0, 0, 0, 0.3),
            inset 0 0 60px rgba(0, 0, 0, 0.1)
          `,
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  METALLIC WHEEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function MetallicWheel({
  rotationValue,
  spinning
}: {
  rotationValue: ReturnType<typeof useMotionValue<number>>
  spinning: boolean
}) {
  const rotation = useTransform(rotationValue, (v) => v)

  return (
    <div
      style={{
        position: 'relative',
        width: 300,
        height: 300,
      }}
    >
      {/* Outer metallic ring */}
      <div
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4a4a50 0%, #2a2a2e 30%, #3a3a40 70%, #1a1a1e 100%)',
          boxShadow: `
            0 20px 50px -15px rgba(0, 0, 0, 0.8),
            0 0 60px -10px rgba(212, 175, 55, 0.15),
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.3)
          `,
        }}
      />

      {/* Notches on the ring (click points) */}
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 4,
            height: 10,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.7), rgba(212,175,55,0.3))',
            borderRadius: 2,
            transformOrigin: 'center -140px',
            transform: `rotate(${i * 15}deg) translateY(-140px)`,
          }}
        />
      ))}

      {/* The spinning wheel */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          rotate: rotation,
        }}
      >
        {/* Wheel background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #1a1a1e 0%, #0a0a0c 100%)',
            border: '3px solid #2a2a2e',
          }}
        />

        {/* Segments */}
        <svg
          viewBox="0 0 300 300"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <defs>
            {SEGMENTS.map((seg, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`segGrad${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={seg.color} />
                <stop offset="100%" stopColor={seg.secondaryColor} />
              </linearGradient>
            ))}
          </defs>

          {SEGMENTS.map((seg, i) => {
            const startAngle = i * SEGMENT_ANGLE - 90
            const endAngle = (i + 1) * SEGMENT_ANGLE - 90
            const startRad = (startAngle * Math.PI) / 180
            const endRad = (endAngle * Math.PI) / 180
            const x1 = 150 + 130 * Math.cos(startRad)
            const y1 = 150 + 130 * Math.sin(startRad)
            const x2 = 150 + 130 * Math.cos(endRad)
            const y2 = 150 + 130 * Math.sin(endRad)

            return (
              <g key={i}>
                <path
                  d={`M150,150 L${x1},${y1} A130,130 0 0,1 ${x2},${y2} Z`}
                  fill={`url(#segGrad${i})`}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="1.5"
                />
                {/* Segment divider lines */}
                <line
                  x1="150"
                  y1="150"
                  x2={x1}
                  y2={y1}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1.5"
                />
              </g>
            )
          })}
        </svg>

        {/* Segment labels */}
        {SEGMENTS.map((seg, i) => {
          const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90
          const rad = (angle * Math.PI) / 180
          const x = 150 + 85 * Math.cos(rad)
          const y = 150 + 85 * Math.sin(rad)

          return (
            <div
              key={`label-${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                fontFamily: 'var(--font-mono)',
                fontSize: seg.type === 'jackpot' ? 15 : 13,
                fontWeight: 800,
                color: seg.type === 'nothing' ? 'var(--text-muted)' : '#0a0a0c',
                textShadow: seg.type === 'nothing'
                  ? 'none'
                  : '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              {seg.label}
            </div>
          )
        })}
      </motion.div>

      {/* Glass Cover */}
      <GlassCover />

      {/* Center hub */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 30%, #8b6914 100%)',
          boxShadow: `
            0 4px 20px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(212, 175, 55, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.4),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #e6c547 0%, #b48e26 100%)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Star size={22} color="#0a0a0c" fill="#0a0a0c" />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  POINTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function Pointer({ spinning }: { spinning: boolean }) {
  return (
    <motion.div
      animate={spinning ? {
        rotate: [-4, 4, -3, 3, -2, 2, 0],
        y: [0, -3, 0, -2, 0],
      } : {}}
      transition={{
        duration: 0.12,
        repeat: spinning ? Infinity : 0,
        repeatType: 'reverse',
      }}
      style={{
        position: 'absolute',
        top: -16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
      }}
    >
      {/* Pointer mount */}
      <div
        style={{
          width: 28,
          height: 10,
          background: 'linear-gradient(180deg, #5a5a60 0%, #3a3a40 50%, #2a2a2e 100%)',
          borderRadius: '6px 6px 0 0',
          margin: '0 auto',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
        }}
      />
      {/* Pointer triangle */}
      <svg
        width="44"
        height="40"
        viewBox="0 0 44 40"
        style={{
          display: 'block',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
        }}
      >
        <defs>
          <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d061" />
            <stop offset="40%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <filter id="pointerInner">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
            <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
        </defs>
        <polygon
          points="22,40 0,0 44,0"
          fill="url(#pointerGrad)"
          stroke="#6b4f0f"
          strokeWidth="1.5"
          filter="url(#pointerInner)"
        />
        {/* Center line detail */}
        <line
          x1="22"
          y1="10"
          x2="22"
          y2="32"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRIGGER BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function TriggerButton({
  onClick,
  disabled,
  spinning,
  canSpin,
  betAmount
}: {
  onClick: () => void
  disabled: boolean
  spinning: boolean
  canSpin: boolean
  betAmount: number
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.95, y: 2 } : undefined}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 280,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Button shadow base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: 4,
          borderRadius: 16,
          background: disabled ? 'rgba(0,0,0,0.3)' : 'rgba(139, 105, 20, 0.6)',
          filter: 'blur(2px)',
        }}
      />

      {/* Main button body */}
      <div
        style={{
          position: 'relative',
          padding: '20px 32px',
          borderRadius: 16,
          background: disabled
            ? 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 50%, #1a1a1e 100%)'
            : 'linear-gradient(180deg, #e6c547 0%, #d4af37 30%, #b48e26 70%, #8b6914 100%)',
          border: disabled
            ? '1px solid rgba(255,255,255,0.05)'
            : '1px solid rgba(245, 208, 97, 0.4)',
          boxShadow: disabled
            ? 'inset 0 2px 4px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.2)'
            : `
              inset 0 2px 4px rgba(255,255,255,0.3),
              inset 0 -2px 4px rgba(0,0,0,0.2),
              0 0 30px rgba(212, 175, 55, 0.3)
            `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {spinning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            >
              <Target size={24} color="var(--bg-void)" />
            </motion.div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--bg-void)',
                letterSpacing: '0.05em',
              }}
            >
              ВРАЩЕНИЕ...
            </span>
          </>
        ) : canSpin ? (
          <>
            <Crosshair size={24} color="var(--bg-void)" strokeWidth={2.5} />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--bg-void)',
                letterSpacing: '0.05em',
              }}
            >
              КРУТИТЬ ({betAmount}₽)
            </span>
          </>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}
          >
            ЗАВТРА
          </span>
        )}
      </div>

      {/* Metallic edge highlights */}
      {!disabled && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 20,
              right: 20,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              borderRadius: 1,
            }}
          />
        </>
      )}
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESULT BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ResultBanner({ result }: { result: RouletteResult }) {
  const isWin = result.type !== 'nothing'

  const icons = {
    bonus: Gift,
    discount: Zap,
    jackpot: Sparkles,
    nothing: Crosshair,
  }
  const Icon = icons[result.type]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      style={{
        padding: '24px 32px',
        borderRadius: 20,
        background: isWin
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(20, 20, 23, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(40, 40, 45, 0.8) 0%, rgba(20, 20, 23, 0.95) 100%)',
        border: isWin
          ? '2px solid rgba(212, 175, 55, 0.5)'
          : '1px solid var(--border-default)',
        boxShadow: isWin
          ? '0 0 40px rgba(212, 175, 55, 0.4), 0 20px 40px -10px rgba(0, 0, 0, 0.6)'
          : '0 10px 30px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={isWin ? {
          rotate: [0, -10, 10, -5, 5, 0],
          scale: [1, 1.15, 1],
        } : {}}
        transition={{ duration: 0.6 }}
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: isWin
            ? 'linear-gradient(135deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)'
            : 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isWin
            ? '0 0 40px rgba(212, 175, 55, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)'
            : 'none',
        }}
      >
        <Icon
          size={32}
          color={isWin ? 'var(--bg-void)' : 'var(--text-muted)'}
          strokeWidth={2}
        />
      </motion.div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 8,
          color: isWin ? 'var(--gold-300)' : 'var(--text-secondary)',
        }}
      >
        {isWin ? 'ПОЗДРАВЛЯЕМ!' : 'НЕ ПОВЕЗЛО'}
      </h3>

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 600,
          color: isWin ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        {result.prize}
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN ROULETTE PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [canSpin, setCanSpin] = useState(user?.daily_luck_available ?? false)
  const [betAmount, setBetAmount] = useState(100)

  // Use motion value for smooth rotation tracking and haptic feedback
  const rotationValue = useMotionValue(0)
  const lastSegmentRef = useRef(0)
  const hapticIntervalRef = useRef<number | null>(null)

  // Calculate current segment from rotation
  const getCurrentSegment = useCallback((rotation: number) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360
    return Math.floor(normalizedRotation / SEGMENT_ANGLE)
  }, [])

  // Haptic feedback on segment change
  useEffect(() => {
    if (spinning) {
      // Start haptic interval during spin
      hapticIntervalRef.current = window.setInterval(() => {
        const currentRotation = rotationValue.get()
        const currentSegment = getCurrentSegment(currentRotation)

        if (currentSegment !== lastSegmentRef.current) {
          // Trigger haptic on segment change
          try {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
            }
          } catch {
            // Haptic not available
          }
          lastSegmentRef.current = currentSegment
        }
      }, 30) // Check every 30ms for smooth feedback
    } else {
      // Clear interval when not spinning
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current)
        hapticIntervalRef.current = null
      }
    }

    return () => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current)
      }
    }
  }, [spinning, rotationValue, getCurrentSegment])

  const handleSpin = async () => {
    if (!canSpin || spinning) return

    // Strong initial haptic
    haptic('heavy')
    setSpinning(true)
    setResult(null)

    // Calculate spin: 8-12 full rotations + random offset
    const currentRotation = rotationValue.get()
    const spins = 8 + Math.random() * 4
    const randomOffset = Math.random() * 360
    const targetRotation = currentRotation + (spins * 360) + randomOffset

    // Animate with custom easing for realistic wheel physics
    animate(rotationValue, targetRotation, {
      duration: 6,
      ease: [0.12, 0.8, 0.12, 1], // Custom easing for realistic deceleration
      onComplete: async () => {
        try {
          const spinResult = await spinRoulette()
          setResult(spinResult)
          setCanSpin(false)

          if (spinResult.type === 'nothing') {
            hapticError()
          } else {
            hapticSuccess()
          }
        } catch {
          hapticError()
          setResult({ prize: 'Ошибка сервера', type: 'nothing', value: 0 })
        } finally {
          setSpinning(false)
        }
      }
    })
  }

  return (
    <div
      className="app-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 120,
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 8,
            letterSpacing: '0.02em',
          }}
          className="gold-gradient-text"
        >
          КОЛЕСО ФОРТУНЫ
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}
        >
          ИСПЫТАЙ УДАЧУ • РАЗ В СУТКИ
        </p>
      </motion.header>

      {/* Wheel Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
        style={{
          position: 'relative',
          marginBottom: 28,
        }}
      >
        <Pointer spinning={spinning} />
        <MetallicWheel rotationValue={rotationValue} spinning={spinning} />

        {/* Ambient glow */}
        <motion.div
          animate={{
            opacity: spinning ? [0.4, 0.7, 0.4] : 0.3,
            scale: spinning ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: spinning ? Infinity : 0,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      </motion.div>

      {/* Bet Selector */}
      <BetSelector
        betAmount={betAmount}
        onBetChange={setBetAmount}
        disabled={spinning || !canSpin}
      />

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="result"
            style={{ marginBottom: 24, width: '100%', maxWidth: 320 }}
          >
            <ResultBanner result={result} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <TriggerButton
        onClick={handleSpin}
        disabled={!canSpin || spinning}
        spinning={spinning}
        canSpin={canSpin}
        betAmount={betAmount}
      />

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 32,
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.8) 0%, rgba(10, 10, 12, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          maxWidth: 320,
          width: '100%',
        }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            marginBottom: 16,
            color: 'var(--gold-400)',
            letterSpacing: '0.1em',
          }}
        >
          ПРАВИЛА ИГРЫ
        </h4>
        <ul
          style={{
            listStyle: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {[
            'Одно вращение в сутки',
            'Бонусы зачисляются мгновенно',
            'Скидки на следующий заказ',
          ].map((rule, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                  boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)',
                  flexShrink: 0,
                }}
              />
              {rule}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  )
}

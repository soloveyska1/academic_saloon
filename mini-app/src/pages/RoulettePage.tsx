import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crosshair, Zap, Gift, Star, Sparkles } from 'lucide-react'
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

// ═══════════════════════════════════════════════════════════════════════════
//  METALLIC WHEEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function MetallicWheel({
  rotation,
  spinning
}: {
  rotation: number
  spinning: boolean
}) {
  const segmentAngle = 360 / SEGMENTS.length

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
          inset: -8,
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

      {/* Notches on the ring */}
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 3,
            height: 8,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.6), rgba(212,175,55,0.2))',
            borderRadius: 2,
            transformOrigin: 'center -140px',
            transform: `rotate(${i * 15}deg) translateY(-140px)`,
          }}
        />
      ))}

      {/* The spinning wheel */}
      <motion.div
        animate={{ rotate: rotation }}
        transition={{
          duration: spinning ? 5 : 0,
          ease: spinning ? [0.12, 0.8, 0.15, 1] : 'linear',
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          filter: spinning ? `blur(${Math.min(rotation / 200, 3)}px)` : 'none',
          transition: 'filter 0.3s',
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
            const startAngle = i * segmentAngle - 90
            const endAngle = (i + 1) * segmentAngle - 90
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
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="1"
                />
                {/* Segment divider lines */}
                <line
                  x1="150"
                  y1="150"
                  x2={x1}
                  y2={y1}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              </g>
            )
          })}
        </svg>

        {/* Segment labels */}
        {SEGMENTS.map((seg, i) => {
          const angle = i * segmentAngle + segmentAngle / 2 - 90
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
                fontSize: seg.type === 'jackpot' ? 14 : 12,
                fontWeight: 700,
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

      {/* Center hub */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 60,
          height: 60,
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
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #e6c547 0%, #b48e26 100%)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Star size={20} color="#0a0a0c" fill="#0a0a0c" />
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
        rotate: [-3, 3, -2, 2, -1, 1, 0],
        y: [0, -2, 0, -1, 0],
      } : {}}
      transition={{
        duration: 0.15,
        repeat: spinning ? Infinity : 0,
        repeatType: 'reverse',
      }}
      style={{
        position: 'absolute',
        top: -12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}
    >
      {/* Pointer mount */}
      <div
        style={{
          width: 24,
          height: 8,
          background: 'linear-gradient(180deg, #4a4a50 0%, #2a2a2e 100%)',
          borderRadius: '4px 4px 0 0',
          margin: '0 auto',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.4)',
        }}
      />
      {/* Pointer triangle */}
      <svg
        width="40"
        height="35"
        viewBox="0 0 40 35"
        style={{
          display: 'block',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        }}
      >
        <defs>
          <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d061" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
        </defs>
        <polygon
          points="20,35 0,0 40,0"
          fill="url(#pointerGrad)"
          stroke="#6b4f0f"
          strokeWidth="1"
        />
        <line
          x1="20"
          y1="8"
          x2="20"
          y2="28"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
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
        padding: '20px 32px',
        borderRadius: 'var(--radius-xl)',
        background: isWin
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(20, 20, 23, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(40, 40, 45, 0.8) 0%, rgba(20, 20, 23, 0.95) 100%)',
        border: isWin
          ? '1px solid rgba(212, 175, 55, 0.4)'
          : '1px solid var(--border-default)',
        boxShadow: isWin
          ? 'var(--glow-gold-strong), var(--shadow-vault)'
          : 'var(--shadow-lg)',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={isWin ? {
          rotate: [0, -10, 10, -5, 5, 0],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{ duration: 0.6 }}
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 12px',
          borderRadius: '50%',
          background: isWin
            ? 'linear-gradient(135deg, var(--gold-400), var(--gold-600))'
            : 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isWin ? 'var(--glow-gold)' : 'none',
        }}
      >
        <Icon
          size={28}
          color={isWin ? 'var(--bg-void)' : 'var(--text-muted)'}
          strokeWidth={2}
        />
      </motion.div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
          color: isWin ? 'var(--gold-300)' : 'var(--text-secondary)',
        }}
      >
        {isWin ? 'Поздравляем!' : 'Не повезло'}
      </h3>

      <p
        className="text-mono"
        style={{
          fontSize: 16,
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
  const [rotation, setRotation] = useState(0)
  const [canSpin, setCanSpin] = useState(user?.daily_luck_available ?? false)

  const handleSpin = async () => {
    if (!canSpin || spinning) return

    haptic('heavy')
    setSpinning(true)
    setResult(null)

    // Calculate spin: 6-10 full rotations + random offset
    const spins = 6 + Math.random() * 4
    const randomOffset = Math.random() * 360
    const newRotation = rotation + (spins * 360) + randomOffset
    setRotation(newRotation)

    try {
      // Wait for animation to mostly complete
      await new Promise(resolve => setTimeout(resolve, 4500))

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

  return (
    <div
      className="app-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
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
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
          }}
          className="gold-gradient-text"
        >
          Колесо Фортуны
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Испытай удачу раз в день
        </p>
      </motion.header>

      {/* Wheel Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          position: 'relative',
          marginBottom: 32,
        }}
      >
        <Pointer spinning={spinning} />
        <MetallicWheel rotation={rotation} spinning={spinning} />

        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: spinning
              ? 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
            transition: 'background 0.5s',
            zIndex: -1,
          }}
        />
      </motion.div>

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

      {/* Spin Button */}
      <motion.button
        onClick={handleSpin}
        disabled={!canSpin || spinning}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileTap={canSpin && !spinning ? { scale: 0.95 } : undefined}
        className="btn-trigger"
        style={{
          width: '100%',
          maxWidth: 280,
          padding: '18px 32px',
          opacity: !canSpin || spinning ? 0.5 : 1,
          cursor: !canSpin || spinning ? 'not-allowed' : 'pointer',
        }}
      >
        {spinning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Crosshair size={22} />
            </motion.div>
            Крутится...
          </>
        ) : canSpin ? (
          <>
            <Crosshair size={22} />
            Крутить барабан
          </>
        ) : (
          'Приходи завтра'
        )}
      </motion.button>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 32,
          padding: 20,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: 320,
          width: '100%',
        }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            marginBottom: 12,
            color: 'var(--text-secondary)',
          }}
        >
          Правила игры
        </h4>
        <ul
          style={{
            listStyle: 'none',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold-400)',
              }}
            />
            Одно вращение в сутки
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold-400)',
              }}
            />
            Бонусы зачисляются мгновенно
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold-400)',
              }}
            />
            Скидки применяются к следующему заказу
          </li>
        </ul>
      </motion.div>
    </div>
  )
}

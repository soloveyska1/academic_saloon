import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Confetti } from '../ui/Confetti'
import { GoldText } from '../ui/GoldText'

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  onSpin: () => Promise<{ bonus: number; streak: number }>
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void
  streakDay: number
}

const SEGMENTS = [
  { label: '15₽', value: 15 },
  { label: '25₽', value: 25 },
  { label: '50₽', value: 50 },
  { label: '30₽', value: 30 },
  { label: '100₽', value: 100 },
  { label: '20₽', value: 20 },
  { label: '75₽', value: 75 },
  { label: '40₽', value: 40 },
]

const SEGMENT_ANGLE = 360 / SEGMENTS.length
const SEGMENT_COLORS = [
  'rgba(212,175,55,0.18)', 'rgba(212,175,55,0.28)',
  'rgba(212,175,55,0.18)', 'rgba(212,175,55,0.28)',
  'rgba(212,175,55,0.35)', 'rgba(212,175,55,0.18)',
  'rgba(212,175,55,0.28)', 'rgba(212,175,55,0.18)',
]

export const SpinWheel = memo(function SpinWheel({
  isOpen,
  onClose,
  onSpin,
  haptic,
  streakDay,
}: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSpun = useRef(false)
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResult(null)
      setError(null)
      setSpinning(false)
      hasSpun.current = false
      setRotation(0)
    }
    return () => {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current)
        spinTimerRef.current = null
      }
    }
  }, [isOpen])

  const handleSpin = useCallback(async () => {
    if (spinning || hasSpun.current) return
    setSpinning(true)
    setError(null)
    haptic('heavy')

    try {
      const res = await onSpin()

      // Find matching segment
      const targetIndex = SEGMENTS.findIndex(s => s.value === res.bonus)
      const segmentIndex = targetIndex >= 0 ? targetIndex : Math.floor(Math.random() * SEGMENTS.length)

      // 5 full spins + land on target
      const targetAngle = 360 - (segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)
      const totalRotation = rotation + 1800 + targetAngle + (Math.random() * SEGMENT_ANGLE * 0.3)

      setRotation(totalRotation)

      spinTimerRef.current = setTimeout(() => {
        haptic('success')
        setResult(res.bonus)
        setShowConfetti(true)
        hasSpun.current = true
        setSpinning(false)
      }, 3200)
    } catch (err) {
      haptic('error')
      setError(err instanceof Error ? err.message : 'Ошибка, попробуйте позже')
      setSpinning(false)
    }
  }, [spinning, rotation, onSpin, haptic])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Confetti
            active={showConfetti}
            colors={['#d4af37', '#f5d061', '#b38728', '#FCF6BA', '#fff']}
            intensity="high"
            onComplete={() => setShowConfetti(false)}
          />

          {/* Close */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top))',
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <X size={18} color="var(--text-secondary)" />
          </motion.button>

          {/* Title */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.55)',
            marginBottom: 6,
          }}>
            День {streakDay + 1}
          </div>
          <div style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 32,
          }}>
            Крутите колесо
          </div>

          {/* Wheel */}
          <div style={{ position: 'relative', width: 260, height: 260, marginBottom: 32 }}>
            {/* Pointer */}
            <div style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '18px solid var(--gold-400)',
              zIndex: 3,
              filter: 'drop-shadow(0 2px 4px rgba(212,175,55,0.3))',
            }} />

            {/* Wheel */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 3.2, ease: [0.12, 0.85, 0.3, 1.01] }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid rgba(212,175,55,0.25)',
                boxShadow: '0 0 40px rgba(212,175,55,0.12), inset 0 0 30px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}
            >
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                {SEGMENTS.map((seg, i) => {
                  const startAngle = i * SEGMENT_ANGLE - 90
                  const endAngle = startAngle + SEGMENT_ANGLE
                  const startRad = (startAngle * Math.PI) / 180
                  const endRad = (endAngle * Math.PI) / 180
                  const x1 = 100 + 100 * Math.cos(startRad)
                  const y1 = 100 + 100 * Math.sin(startRad)
                  const x2 = 100 + 100 * Math.cos(endRad)
                  const y2 = 100 + 100 * Math.sin(endRad)
                  const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180
                  const textX = 100 + 60 * Math.cos(midAngle)
                  const textY = 100 + 60 * Math.sin(midAngle)
                  const textRotation = (startAngle + endAngle) / 2 + 90

                  return (
                    <g key={i}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                        fill={SEGMENT_COLORS[i]}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={0.5}
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                        fill="var(--gold-200)"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}
                <circle cx="100" cy="100" r="16" fill="var(--bg-primary)" stroke="rgba(212,175,55,0.25)" strokeWidth="2" />
              </svg>
            </motion.div>
          </div>

          {/* Result or button */}
          <AnimatePresence mode="wait">
            {result !== null ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ textAlign: 'center' }}
              >
                <GoldText
                  variant="liquid"
                  weight={700}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 36,
                    lineHeight: 1,
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  +{result} ₽
                </GoldText>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 20,
                }}>
                  Бонус зачислен!
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{
                    padding: '14px 32px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--gold-metallic)',
                    color: 'var(--text-on-gold)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--glow-gold)',
                  }}
                >
                  Отлично
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="spin" style={{ textAlign: 'center' }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSpin}
                  disabled={spinning}
                  style={{
                    padding: '16px 40px',
                    borderRadius: 12,
                    border: 'none',
                    background: spinning ? 'var(--gold-glass-medium)' : 'var(--gold-metallic)',
                    color: spinning ? 'var(--gold-200)' : 'var(--text-on-gold)',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: spinning ? 'not-allowed' : 'pointer',
                    boxShadow: spinning ? 'none' : 'var(--glow-gold)',
                    opacity: spinning ? 0.7 : 1,
                    letterSpacing: '0.02em',
                  }}
                >
                  {spinning ? 'Вращается...' : 'Запустить'}
                </motion.button>
                {error && (
                  <div style={{
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--error-text)',
                  }}>
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

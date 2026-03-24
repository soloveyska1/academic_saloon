import { memo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Confetti } from '../ui/Confetti'

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  onSpin: () => Promise<{ bonus: number; streak: number }>
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void
  streakDay: number
}

const SEGMENTS = [
  { label: '15₽', value: 15, color: 'rgba(212,175,55,0.25)' },
  { label: '25₽', value: 25, color: 'rgba(212,175,55,0.35)' },
  { label: '50₽', value: 50, color: 'rgba(212,175,55,0.25)' },
  { label: '30₽', value: 30, color: 'rgba(212,175,55,0.35)' },
  { label: '100₽', value: 100, color: 'rgba(212,175,55,0.25)' },
  { label: '20₽', value: 20, color: 'rgba(212,175,55,0.35)' },
  { label: '75₽', value: 75, color: 'rgba(212,175,55,0.25)' },
  { label: '40₽', value: 40, color: 'rgba(212,175,55,0.35)' },
]

const SEGMENT_ANGLE = 360 / SEGMENTS.length

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
  const hasSpun = useRef(false)

  const handleSpin = useCallback(async () => {
    if (spinning || hasSpun.current) return
    setSpinning(true)
    haptic('heavy')

    try {
      const res = await onSpin()

      // Find segment index for the won amount
      const targetIndex = SEGMENTS.findIndex(s => s.value === res.bonus)
      const segmentIndex = targetIndex >= 0 ? targetIndex : 0

      // Calculate rotation: 5 full spins + target segment
      const targetAngle = 360 - (segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)
      const totalRotation = rotation + 1800 + targetAngle + Math.random() * 10

      setRotation(totalRotation)

      // Show result after spin completes
      setTimeout(() => {
        haptic('success')
        setResult(res.bonus)
        setShowConfetti(true)
        hasSpun.current = true
        setSpinning(false)
      }, 3500)
    } catch {
      haptic('error')
      setSpinning(false)
    }
  }, [spinning, rotation, onSpin, haptic])

  const handleClose = useCallback(() => {
    setRotation(0)
    setResult(null)
    hasSpun.current = false
    onClose()
  }, [onClose])

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
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
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

          {/* Close button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top))',
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <X size={18} color="rgba(255,255,255,0.6)" />
          </motion.button>

          {/* Title */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.55)',
            marginBottom: 8,
          }}>
            День {streakDay + 1}
          </div>
          <div style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 32,
          }}>
            Крутите колесо!
          </div>

          {/* Wheel */}
          <div style={{ position: 'relative', width: 280, height: 280, marginBottom: 32 }}>
            {/* Pointer */}
            <div style={{
              position: 'absolute',
              top: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '20px solid var(--gold-400)',
              zIndex: 3,
              filter: 'drop-shadow(0 2px 6px rgba(212,175,55,0.4))',
            }} />

            {/* Wheel SVG */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{
                duration: 3.5,
                ease: [0.15, 0.85, 0.35, 1.02],
              }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid rgba(212,175,55,0.3)',
                boxShadow: '0 0 40px rgba(212,175,55,0.15), inset 0 0 30px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                position: 'relative',
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
                  const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0

                  // Text position
                  const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180
                  const textX = 100 + 65 * Math.cos(midAngle)
                  const textY = 100 + 65 * Math.sin(midAngle)
                  const textRotation = (startAngle + endAngle) / 2 + 90

                  return (
                    <g key={i}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={seg.color}
                        stroke="rgba(0,0,0,0.3)"
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
                        fontFamily="var(--font-body)"
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}
                {/* Center circle */}
                <circle cx="100" cy="100" r="18" fill="var(--bg-primary)" stroke="rgba(212,175,55,0.3)" strokeWidth="2" />
                <text x="100" y="102" textAnchor="middle" dominantBaseline="middle" fill="var(--gold-400)" fontSize="10" fontWeight="800">
                  ₽
                </text>
              </svg>
            </motion.div>
          </div>

          {/* Result or spin button */}
          <AnimatePresence mode="wait">
            {result !== null ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 36,
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                  marginBottom: 8,
                }}>
                  +{result} ₽
                </div>
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
                  onClick={handleClose}
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
                  Отлично!
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="spin"
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleSpin}
                disabled={spinning}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '16px 40px',
                  borderRadius: 12,
                  border: 'none',
                  background: spinning ? 'var(--gold-glass-medium)' : 'var(--gold-metallic)',
                  color: spinning ? 'var(--gold-200)' : 'var(--text-on-gold)',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: spinning ? 'not-allowed' : 'pointer',
                  boxShadow: spinning ? 'none' : 'var(--glow-gold)',
                  opacity: spinning ? 0.7 : 1,
                }}
              >
                {spinning ? 'Крутится...' : 'Крутить!'}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

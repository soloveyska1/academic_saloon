import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Sparkles, X, Volume2 } from 'lucide-react'
import { Confetti } from './Confetti'

interface Props {
  prize: string
  prizeAmount: number
  onReveal: () => void
  onClose: () => void
}

export function ScratchCard({ prize, prizeAmount, onReveal, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchPercent, setScratchPercent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  // Canvas dimensions
  const WIDTH = 280
  const HEIGHT = 180
  const REVEAL_THRESHOLD = 50 // Percent to reveal

  // Initialize canvas with scratch layer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = WIDTH * 2 // 2x for retina
    canvas.height = HEIGHT * 2
    ctx.scale(2, 2)

    // Draw golden scratch layer
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    gradient.addColorStop(0, '#b38728')
    gradient.addColorStop(0.25, '#d4af37')
    gradient.addColorStop(0.5, '#f5d061')
    gradient.addColorStop(0.75, '#d4af37')
    gradient.addColorStop(1, '#b38728')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Add some sparkle pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * WIDTH
      const y = Math.random() * HEIGHT
      const size = Math.random() * 3 + 1
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Add text
    ctx.fillStyle = '#09090b'
    ctx.font = 'bold 16px Montserrat, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('СОТРИ И УЗНАЙ ПРИЗ', WIDTH / 2, HEIGHT / 2 - 10)

    ctx.font = '12px Montserrat, sans-serif'
    ctx.fillText('Проведи пальцем', WIDTH / 2, HEIGHT / 2 + 15)
  }, [])

  // Calculate scratch percentage
  const calculateScratchPercent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return 0

    const ctx = canvas.getContext('2d')
    if (!ctx) return 0

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparent = 0

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparent++
      }
    }

    return (transparent / (pixels.length / 4)) * 100
  }, [])

  // Scratch at position
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (x - rect.left) * scaleX / 2
    const canvasY = (y - rect.top) * scaleY / 2

    ctx.globalCompositeOperation = 'destination-out'

    // Draw scratch circle
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 25, 0, Math.PI * 2)
    ctx.fill()

    // Draw line from last position
    if (lastPosRef.current) {
      ctx.lineWidth = 50
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(canvasX, canvasY)
      ctx.stroke()
    }

    lastPosRef.current = { x: canvasX, y: canvasY }

    // Calculate and check percentage
    const percent = calculateScratchPercent()
    setScratchPercent(percent)

    if (percent >= REVEAL_THRESHOLD && !revealed) {
      setRevealed(true)
      setShowConfetti(true)
      onReveal()

      // Haptic feedback
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      } catch {}
    }
  }, [calculateScratchPercent, revealed, onReveal])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsScratching(true)
    const touch = e.touches[0]
    scratch(touch.clientX, touch.clientY)

    // Light haptic
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {}
  }, [scratch])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!isScratching) return
    const touch = e.touches[0]
    scratch(touch.clientX, touch.clientY)
  }, [isScratching, scratch])

  const handleTouchEnd = useCallback(() => {
    setIsScratching(false)
    lastPosRef.current = null
  }, [])

  // Mouse handlers for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsScratching(true)
    scratch(e.clientX, e.clientY)
  }, [scratch])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isScratching) return
    scratch(e.clientX, e.clientY)
  }, [isScratching, scratch])

  const handleMouseUp = useCallback(() => {
    setIsScratching(false)
    lastPosRef.current = null
  }, [])

  return (
    <>
      <Confetti
        active={showConfetti}
        intensity="extreme"
        onComplete={() => setShowConfetti(false)}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(20,20,23,0.98) 30%)',
            border: '2px solid rgba(212,175,55,0.4)',
            borderRadius: 28,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 60px rgba(212,175,55,0.2)',
          }}
        >
          {/* Close button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 10,
              padding: 10,
              cursor: 'pointer',
              color: '#71717a',
              zIndex: 10,
            }}
          >
            <X size={18} />
          </motion.button>

          {/* Header */}
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #d4af37, #b38728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 40px rgba(212,175,55,0.5)',
            }}
          >
            <Gift size={36} color="#09090b" />
          </motion.div>

          <h2 style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 6,
            fontFamily: "'Playfair Display', serif",
          }}>
            Скретч-Карта
          </h2>

          <p style={{
            fontSize: 13,
            color: '#a1a1aa',
            marginBottom: 20,
          }}>
            Сотри покрытие и узнай свой приз!
          </p>

          {/* Scratch Card Area */}
          <div style={{
            position: 'relative',
            width: WIDTH,
            height: HEIGHT,
            margin: '0 auto 20px',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(212,175,55,0.3)',
          }}>
            {/* Prize layer (underneath) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: revealed
                ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(20,20,23,0.95))'
                : 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(20,20,23,0.95))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.5s',
            }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={revealed ? { scale: 1, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
              >
                <Sparkles
                  size={32}
                  color={revealed ? '#22c55e' : '#d4af37'}
                  style={{ marginBottom: 8 }}
                />
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={revealed ? { scale: [0, 1.2, 1] } : { scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: revealed ? '#22c55e' : '#d4af37',
                  fontFamily: "'Montserrat', sans-serif",
                  textShadow: revealed ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
                }}
              >
                +{prizeAmount} ₽
              </motion.div>

              <div style={{
                fontSize: 12,
                color: '#a1a1aa',
                marginTop: 4,
              }}>
                {prize}
              </div>
            </div>

            {/* Scratch layer (canvas) */}
            <canvas
              ref={canvasRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: isScratching ? 'grabbing' : 'grab',
                touchAction: 'none',
                opacity: revealed ? 0 : 1,
                transition: 'opacity 0.5s',
              }}
            />
          </div>

          {/* Progress indicator */}
          <div style={{
            marginBottom: 16,
          }}>
            <div style={{
              height: 4,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 2,
              overflow: 'hidden',
              marginBottom: 6,
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(scratchPercent * 2, 100)}%` }}
                style={{
                  height: '100%',
                  background: scratchPercent >= REVEAL_THRESHOLD
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #d4af37, #f5d061)',
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{
              fontSize: 11,
              color: '#71717a',
            }}>
              {revealed ? (
                <span style={{ color: '#22c55e' }}>Приз получен!</span>
              ) : (
                `Стёрто: ${Math.round(scratchPercent)}%`
              )}
            </div>
          </div>

          {/* Action button */}
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.button
                key="claim"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: 14,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 30px rgba(34,197,94,0.4)',
                }}
              >
                Забрать {prizeAmount} ₽
              </motion.button>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 12,
                  color: '#d4af37',
                  fontSize: 13,
                }}
              >
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  👆
                </motion.div>
                Води пальцем по карте
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  )
}

// Bonus prizes configuration
export const SCRATCH_PRIZES = [
  { prize: 'Бонус за лояльность', amount: 50, weight: 40 },
  { prize: 'Кэшбек', amount: 100, weight: 30 },
  { prize: 'VIP бонус', amount: 200, weight: 20 },
  { prize: 'Джекпот!', amount: 500, weight: 8 },
  { prize: 'МЕГА ДЖЕКПОТ!', amount: 1000, weight: 2 },
]

export function getRandomPrize() {
  const totalWeight = SCRATCH_PRIZES.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight

  for (const prize of SCRATCH_PRIZES) {
    random -= prize.weight
    if (random <= 0) {
      return prize
    }
  }

  return SCRATCH_PRIZES[0]
}

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  x: number
  y: number
  rotation: number
  color: string
  size: number
  velocityX: number
  velocityY: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle' | 'star' | 'triangle'
  wobble: number
  wobbleSpeed: number
}

interface Props {
  active: boolean
  onComplete?: () => void
  duration?: number
  particleCount?: number
  colors?: string[]
  intensity?: 'low' | 'medium' | 'high' | 'extreme'
}

const GOLD_COLORS = [
  '#d4af37', // Gold
  '#f5d061', // Light gold
  '#b38728', // Dark gold
  '#FCF6BA', // Cream gold
  '#fff',    // White sparkle
]

const PARTY_COLORS = [
  '#d4af37', // Gold
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
]

// Оптимизировано для мобильных устройств - уменьшено количество частиц
const INTENSITY_CONFIG = {
  low: { count: 30, gravity: 0.25, spread: 150 },
  medium: { count: 60, gravity: 0.3, spread: 250 },
  high: { count: 100, gravity: 0.35, spread: 350 },
  extreme: { count: 150, gravity: 0.4, spread: 500 },
}

export function Confetti({
  active,
  onComplete,
  duration = 5000,
  particleCount,
  colors = PARTY_COLORS,
  intensity = 'medium', // Изменено с 'high' для оптимизации на мобильных
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<ConfettiPiece[]>([])
  const startTimeRef = useRef<number>(0)

  const config = INTENSITY_CONFIG[intensity]
  const actualCount = particleCount || config.count

  const createParticle = useCallback((width: number, height: number, burst: boolean = false): ConfettiPiece => {
    const shapes: ConfettiPiece['shape'][] = ['rect', 'circle', 'star', 'triangle']
    const angle = burst
      ? Math.random() * Math.PI * 2 // Full circle burst
      : -Math.PI / 2 + (Math.random() - 0.5) * 1.5 // Upward with spread

    const velocity = burst
      ? Math.random() * 15 + 10
      : Math.random() * 18 + 12

    return {
      x: width / 2 + (Math.random() - 0.5) * config.spread,
      y: burst ? height / 2 : height + 20,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 6,
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity,
      rotationSpeed: (Math.random() - 0.5) * 15,
      opacity: 1,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      wobble: Math.random() * 10,
      wobbleSpeed: Math.random() * 0.1 + 0.05,
    }
  }, [colors, config.spread])

  const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
    const spikes = 5
    const outerRadius = size / 2
    const innerRadius = size / 4
    let rot = Math.PI / 2 * 3
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(0, -outerRadius)

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius)
      rot += step
      ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius)
      rot += step
    }
    ctx.lineTo(0, -outerRadius)
    ctx.closePath()
    ctx.fill()
  }

  const drawTriangle = (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath()
    ctx.moveTo(0, -size / 2)
    ctx.lineTo(size / 2, size / 2)
    ctx.lineTo(-size / 2, size / 2)
    ctx.closePath()
    ctx.fill()
  }

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const elapsed = timestamp - startTimeRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gravity = config.gravity
    const friction = 0.99
    const windStrength = Math.sin(elapsed * 0.001) * 0.3

    particlesRef.current = particlesRef.current.filter(particle => {
      // Update physics
      particle.velocityY += gravity
      particle.velocityX *= friction
      particle.velocityX += windStrength
      particle.x += particle.velocityX
      particle.y += particle.velocityY
      particle.rotation += particle.rotationSpeed
      particle.wobble += particle.wobbleSpeed

      // Add wobble
      particle.x += Math.sin(particle.wobble) * 0.5

      // Fade out when falling below screen or after time
      if (particle.y > canvas.height * 0.7 || elapsed > duration * 0.6) {
        particle.opacity -= 0.015
      }

      // Draw particle
      if (particle.opacity > 0) {
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate((particle.rotation * Math.PI) / 180)
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.shadowColor = particle.color
        ctx.shadowBlur = 3

        switch (particle.shape) {
          case 'rect':
            ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
            break
          case 'circle':
            ctx.beginPath()
            ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'star':
            drawStar(ctx, particle.size)
            break
          case 'triangle':
            drawTriangle(ctx, particle.size)
            break
        }

        ctx.restore()
      }

      return particle.opacity > 0 && particle.y < canvas.height + 100 && particle.x > -50 && particle.x < canvas.width + 50
    })

    if (particlesRef.current.length > 0 && elapsed < duration) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      onComplete?.()
    }
  }, [config.gravity, duration, onComplete])

  useEffect(() => {
    if (!active) {
      particlesRef.current = []
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create particles in bursts
    const createBurst = (count: number, burst: boolean = false) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height, burst))
      }
    }

    // Initial big burst from center
    createBurst(Math.floor(actualCount * 0.3), true)

    // Wave bursts from bottom
    const burst1 = setTimeout(() => createBurst(Math.floor(actualCount * 0.25)), 100)
    const burst2 = setTimeout(() => createBurst(Math.floor(actualCount * 0.25)), 250)
    const burst3 = setTimeout(() => createBurst(Math.floor(actualCount * 0.2)), 450)

    // Start animation
    startTimeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup after duration
    const cleanup = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }, duration + 500)

    return () => {
      clearTimeout(burst1)
      clearTimeout(burst2)
      clearTimeout(burst3)
      clearTimeout(cleanup)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [active, animate, createParticle, duration, actualCount])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.canvas
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </AnimatePresence>
  )
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [isActive, setIsActive] = useState(false)

  const fire = useCallback(() => {
    setIsActive(true)
  }, [])

  const reset = useCallback(() => {
    setIsActive(false)
  }, [])

  return { isActive, fire, reset }
}

// Pre-configured confetti types
export function GoldConfetti(props: Omit<Props, 'colors'>) {
  return <Confetti {...props} colors={GOLD_COLORS} />
}

export function CelebrationConfetti(props: Omit<Props, 'colors' | 'intensity'>) {
  return <Confetti {...props} colors={PARTY_COLORS} intensity="extreme" />
}

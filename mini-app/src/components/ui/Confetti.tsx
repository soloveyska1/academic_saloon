import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  rotation: number
}

interface Props {
  active: boolean
  onComplete?: () => void
}

export function Confetti({ active, onComplete }: Props) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = []
      const colors = ['#d4af37', '#FCF6BA', '#B38728', '#f5d061', '#fff']

      for (let i = 0; i < 50; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
        })
      }
      setPieces(newPieces)

      const timer = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [active, onComplete])

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                boxShadow: `0 0 6px ${piece.color}`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

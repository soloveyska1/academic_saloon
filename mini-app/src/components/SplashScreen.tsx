import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuxuryLoader } from './ui/LuxuryLoader'

interface SplashScreenProps {
  onComplete: () => void
  /**
   * Optional flag to end the intro early when upstream data is ready.
   */
  ready?: boolean
}

export const SplashScreen = ({ onComplete, ready = false }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'intro' | 'line' | 'exit'>('intro')
  const [hasSeen, setHasSeen] = useState(false)

  // Session-aware shortcut
  useEffect(() => {
    const seen = sessionStorage.getItem('as_intro_seen') === 'true'
    if (seen) {
      setHasSeen(true)
      const timer = setTimeout(onComplete, 500)
      return () => clearTimeout(timer)
    }

    sessionStorage.setItem('as_intro_seen', 'true')

    const lineTimer = setTimeout(() => setPhase('line'), 800)
    const exitTimer = setTimeout(() => setPhase('exit'), 2500)
    const completeTimer = setTimeout(onComplete, 3400)

    return () => {
      clearTimeout(lineTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  // Early exit when app data is ready
  useEffect(() => {
    if (!hasSeen && ready && phase !== 'exit') {
      setPhase('exit')
      const timer = setTimeout(onComplete, 900)
      return () => clearTimeout(timer)
    }
  }, [hasSeen, onComplete, phase, ready])

  if (hasSeen) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030303]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <QuickMonogram />
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="golden-reveal"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(18,18,18,0.4) 0%, rgba(3,3,3,0.95) 55%, #010101 100%)',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Vignette overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.9) 100%)',
            }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-7"
            animate={phase === 'exit' ? { scale: 20, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          >
            <ShimmeringTitle active={phase !== 'intro'} />

            <motion.div
              className="relative h-[1px] w-full max-w-[320px] overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: phase !== 'intro' ? '100%' : 0, opacity: phase !== 'intro' ? 1 : 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #FCF6BA 50%, transparent 100%)',
                  boxShadow: '0 0 18px rgba(252,246,186,0.35)',
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: phase !== 'intro' ? 1 : 0, y: phase !== 'intro' ? 0 : 10 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
            >
              <LuxuryLoader />
            </motion.div>

            <motion.span
              className="font-serif text-[10px] tracking-[0.55em] uppercase"
              style={{ color: 'rgba(252,246,186,0.55)', fontFamily: '"Cinzel", "Playfair Display", serif' }}
              initial={{ opacity: 0, letterSpacing: '0.35em' }}
              animate={{ opacity: phase !== 'intro' ? 1 : 0, letterSpacing: phase !== 'intro' ? '0.55em' : '0.35em' }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.25 }}
            >
              premium entrance
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const ShimmeringTitle = ({ active }: { active: boolean }) => {
  return (
    <div className="relative flex items-center justify-center">
      <h1
        className="text-center text-3xl md:text-5xl font-bold tracking-[0.28em] md:tracking-[0.32em]"
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          color: '#4a3a20',
          textShadow: '0 3px 16px rgba(0,0,0,0.6)',
        }}
      >
        ACADEMIC SALOON
      </h1>

      <motion.h1
        className="absolute inset-0 text-center text-3xl md:text-5xl font-bold tracking-[0.28em] md:tracking-[0.32em]"
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          background: 'linear-gradient(90deg, #46351D 0%, #46351D 35%, #FCF6BA 50%, #46351D 65%, #46351D 100%)',
          backgroundSize: '220% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
        initial={{ backgroundPosition: '-120% 0' }}
        animate={
          active
            ? {
                backgroundPosition: ['-120% 0', '140% 0'],
              }
            : { backgroundPosition: '-120% 0' }
        }
        transition={{ duration: 2, ease: 'easeInOut', repeat: active ? Infinity : 0, repeatDelay: 0.4 }}
      >
        ACADEMIC SALOON
      </motion.h1>

      <motion.div
        className="pointer-events-none absolute inset-0 blur-xl"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(252,246,186,0.35), transparent)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? [0.25, 0.6, 0.25] : 0 }}
        transition={{ duration: 2, repeat: active ? Infinity : 0, repeatDelay: 0.4 }}
      />
    </div>
  )
}

const QuickMonogram = () => (
  <div className="flex flex-col items-center">
    <span
      className="font-serif text-4xl font-bold"
      style={{
        fontFamily: '"Cinzel", "Playfair Display", serif',
        background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 55%, #B38728 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      AS
    </span>
  </div>
)

export default SplashScreen

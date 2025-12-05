import { useCallback, useEffect, useRef, useState } from 'react'
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
  const MIN_DWELL_MS = 2300
  const [phase, setPhase] = useState<'intro' | 'line' | 'seal' | 'exit'>('intro')
  const [hasSeen, setHasSeen] = useState(false)
  const startRef = useRef(performance.now())
  const timersRef = useRef<number[]>([])
  const completedRef = useRef(false)

  const clearTimers = () => {
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current = []
  }

  const safeComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }, [onComplete])

  // Session-aware shortcut
  useEffect(() => {
    const seen = sessionStorage.getItem('as_intro_seen') === 'true'
    if (seen) {
      setHasSeen(true)
      const timer = window.setTimeout(safeComplete, 500)
      timersRef.current = [timer]
      return () => clearTimers()
    }

    sessionStorage.setItem('as_intro_seen', 'true')

    const lineTimer = window.setTimeout(() => setPhase('line'), 750)
    const sealTimer = window.setTimeout(() => setPhase('seal'), 1400)
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2550)
    const completeTimer = window.setTimeout(safeComplete, 3100)

    timersRef.current = [lineTimer, sealTimer, exitTimer, completeTimer]

    return () => clearTimers()
  }, [safeComplete])

  // Early exit when app data is ready (with a minimum cinematic dwell time)
  useEffect(() => {
    if (hasSeen || phase === 'exit' || !ready) return

    const elapsed = performance.now() - startRef.current
    const wait = Math.max(0, MIN_DWELL_MS - elapsed)

    clearTimers()
    const exitTimer = window.setTimeout(() => setPhase('exit'), wait)
    const completeTimer = window.setTimeout(safeComplete, wait + 550)
    timersRef.current = [exitTimer, completeTimer]

    return () => clearTimers()
  }, [hasSeen, phase, ready, safeComplete])

  if (hasSeen) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]"
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
              'radial-gradient(circle at 50% 40%, rgba(28,23,12,0.45) 0%, rgba(5,5,5,0.92) 60%, #020202 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Vignette overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 70%, #000 100%)',
            }}
          />

          {/* Horizon light */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,214,150,0.08) 0%, rgba(255,214,150,0.04) 40%, rgba(0,0,0,0.5) 100%)',
            }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={
              phase === 'exit'
                ? { scale: 16, opacity: 0, y: -12 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1] }}
          >
            <ShimmeringTitle active={phase !== 'exit'} />

            <motion.div
              className="relative h-[1px] w-full max-w-[360px] overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: phase !== 'intro' ? '100%' : 0,
                opacity: phase !== 'intro' ? 1 : 0,
              }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #FCF6BA 55%, transparent 100%)',
                  boxShadow: '0 0 22px rgba(252,246,186,0.32)',
                }}
              />
              <motion.div
                className="absolute -left-full top-0 h-px w-1/3 bg-[#FCF6BA]"
                animate={{ x: phase !== 'intro' ? ['0%', '180%'] : '0%' }}
                transition={{ repeat: phase !== 'intro' ? Infinity : 0, duration: 1.85, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.div
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{
                opacity: phase === 'seal' || phase === 'exit' ? 1 : 0,
                y: phase === 'seal' || phase === 'exit' ? 0 : 10,
                scale: phase === 'seal' || phase === 'exit' ? 1 : 0.96,
              }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
            >
              <LuxuryLoader size={156} />
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'seal' || phase === 'exit' ? 0.4 : 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(252,246,186,0.14) 0%, rgba(252,246,186,0) 70%)',
                }}
              />
            </motion.div>

            <motion.span
              className="font-serif text-[10px] uppercase tracking-[0.55em] text-[rgba(252,246,186,0.65)]"
              style={{ fontFamily: '"Cinzel", "Playfair Display", serif' }}
              initial={{ opacity: 0, letterSpacing: '0.32em' }}
              animate={{
                opacity: phase === 'seal' || phase === 'exit' ? 1 : 0,
                letterSpacing: phase === 'seal' || phase === 'exit' ? '0.55em' : '0.32em',
              }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.12 }}
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
      <motion.h1
        className="text-center text-3xl font-bold tracking-[0.3em] text-[#3a2d17] drop-shadow-xl md:text-5xl md:tracking-[0.32em]"
        style={{ fontFamily: '"Cinzel", "Playfair Display", serif' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
      >
        ACADEMIC SALOON
      </motion.h1>

      <motion.h1
        className="absolute inset-0 text-center text-3xl font-bold tracking-[0.3em] md:text-5xl md:tracking-[0.32em]"
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          background:
            'linear-gradient(90deg, #46351D 0%, #46351D 26%, #FCF6BA 50%, #46351D 74%, #46351D 100%)',
          backgroundSize: '230% 100%',
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
        transition={{ duration: 1.6, ease: 'easeInOut', repeat: active ? Infinity : 0, repeatDelay: 0.3 }}
      >
        ACADEMIC SALOON
      </motion.h1>

      <motion.div
        className="pointer-events-none absolute inset-0 blur-xl"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(252,246,186,0.42), transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? [0.2, 0.55, 0.2] : 0 }}
        transition={{ duration: 1.6, repeat: active ? Infinity : 0, repeatDelay: 0.3 }}
      />
    </div>
  )
}

const QuickMonogram = () => (
  <div className="flex flex-col items-center">
    <span
      className="bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text font-serif text-4xl font-bold text-transparent"
      style={{ fontFamily: '"Cinzel", "Playfair Display", serif' }}
    >
      AS
    </span>
  </div>
)

export default SplashScreen

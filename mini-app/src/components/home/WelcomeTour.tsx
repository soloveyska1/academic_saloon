import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldCheck, Clock, Sparkles, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  WELCOME TOUR — 3-step onboarding for first-time users
//  Shows once per device via localStorage. Premium gold+void design.
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'as_welcome_seen'

interface WelcomeTourProps {
  onComplete: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

interface Slide {
  icon: typeof ShieldCheck
  iconGradient: string
  iconGlow: string
  title: string
  subtitle: string
  bullets: string[]
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    iconGradient: 'linear-gradient(135deg, #d4af37, #f5d76e)',
    iconGlow: 'rgba(212,175,55,0.4)',
    title: 'Добро пожаловать',
    subtitle: 'Мы помогаем студентам с учебными работами — быстро, качественно и конфиденциально',
    bullets: [
      'Курсовые, дипломные, эссе и другие работы',
      'Индивидуальный подход к каждому заказу',
      'Оплата только после согласования',
    ],
  },
  {
    icon: Clock,
    iconGradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    iconGlow: 'rgba(59,130,246,0.4)',
    title: 'Как это работает',
    subtitle: 'Три простых шага от заявки до готовой работы',
    bullets: [
      '1. Выберите тип работы и укажите требования',
      '2. Получите оценку стоимости и сроков',
      '3. Оплатите и получите готовую работу в срок',
    ],
  },
  {
    icon: ShieldCheck,
    iconGradient: 'linear-gradient(135deg, #22c55e, #4ade80)',
    iconGlow: 'rgba(34,197,94,0.4)',
    title: 'Гарантии',
    subtitle: 'Ваше спокойствие — наш приоритет',
    bullets: [
      'Бесплатные доработки до полного соответствия',
      'Проверка на антиплагиат включена',
      'Полная конфиденциальность данных',
    ],
  },
]

/** Check if tour was already seen */
export function hasSeenWelcomeTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Mark tour as seen */
function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch { /* ignore */ }
}

export function WelcomeTour({ onComplete, haptic }: WelcomeTourProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  const handleNext = useCallback(() => {
    haptic('light')
    if (isLast) {
      markTourSeen()
      onComplete()
    } else {
      setDirection(1)
      setStep(s => s + 1)
    }
  }, [isLast, onComplete, haptic])

  const handleSkip = useCallback(() => {
    haptic('light')
    markTourSeen()
    onComplete()
  }, [onComplete, haptic])

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return
    const dx = e.changedTouches[0].clientX - touchStart
    if (dx < -50 && !isLast) {
      haptic('light')
      setDirection(1)
      setStep(s => s + 1)
    } else if (dx > 50 && step > 0) {
      haptic('light')
      setDirection(-1)
      setStep(s => s - 1)
    }
    setTouchStart(null)
  }, [touchStart, isLast, step, haptic])

  // Prevent body scroll while tour is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  const Icon = slide.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 20px',
      }}
    >
      {/* Skip button */}
      {!isLast && (
        <motion.button
          type="button"
          onClick={handleSkip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            right: 16,
            padding: '8px 16px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Пропустить
        </motion.button>
      )}

      {/* Slide content */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 340,
        width: '100%',
      }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: slide.iconGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: `0 12px 40px -8px ${slide.iconGlow}`,
                position: 'relative',
              }}
            >
              {/* Glass shine */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                borderRadius: '20px 20px 50% 50%',
              }} />
              <Icon size={28} color="#fff" strokeWidth={1.5} />
            </motion.div>

            {/* Title */}
            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#fff',
              marginBottom: 8,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {slide.title}
            </h2>

            {/* Subtitle */}
            <p style={{
              fontSize: 13.5,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
              marginBottom: 20,
              maxWidth: 300,
            }}>
              {slide.subtitle}
            </p>

            {/* Bullets */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: '100%',
              textAlign: 'left',
            }}>
              {slide.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '6px 0',
                  }}
                >
                  <div style={{
                    width: 5, height: 5, borderRadius: 3,
                    background: slide.iconGradient,
                    flexShrink: 0,
                    marginTop: 7,
                  }} />
                  <span style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                  }}>
                    {bullet}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: dots + CTA */}
      <div style={{
        flexShrink: 0,
        width: '100%',
        maxWidth: 360,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        paddingTop: 12,
      }}>
        {/* Step dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}>
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 24 : 8,
                background: i === step ? '#d4af37' : 'rgba(255,255,255,0.15)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                height: 8,
                borderRadius: 4,
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          type="button"
          onClick={handleNext}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            background: isLast
              ? 'linear-gradient(135deg, #d4af37, #f5d76e)'
              : 'rgba(255,255,255,0.08)',
            border: isLast
              ? '1px solid rgba(212,175,55,0.4)'
              : '1px solid rgba(255,255,255,0.12)',
            color: isLast ? '#09090b' : '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isLast ? 'Начать' : 'Далее'}
          <ArrowRight size={18} strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  )
}

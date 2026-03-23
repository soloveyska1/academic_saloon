import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldCheck, Clock, Sparkles, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  WELCOME TOUR — 3-step onboarding for first-time users
//  Gold+onyx premium design matching the app's visual language.
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'as_welcome_seen'

interface WelcomeTourProps {
  onComplete: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

interface Slide {
  icon: typeof ShieldCheck
  title: string
  subtitle: string
  bullets: string[]
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
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
    title: 'Гарантии',
    subtitle: 'Ваше спокойствие — наш приоритет',
    bullets: [
      'Бесплатные доработки до полного соответствия',
      'Высокая уникальность текста гарантирована',
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
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
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
        background: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 20px',
        overflow: 'hidden',
      }}
    >
      {/* Ambient gold glow — top */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140%',
        height: '50%',
        background: 'radial-gradient(ellipse at center, var(--gold-glass-subtle) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

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
            padding: '10px 18px',
            minHeight: 44,
            borderRadius: 12,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.02em',
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
            {/* Icon — always gold, glass style */}
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--gold-glass-medium), var(--gold-glass-subtle))',
                border: '1px solid var(--gold-glass-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: '0 8px 32px -8px var(--gold-glass-strong)',
              }}
            >
              <Icon size={24} color="var(--gold-400)" strokeWidth={1.5} />
            </motion.div>

            {/* Title — serif display font */}
            <h2 style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              fontStyle: 'italic',
              color: 'var(--text-primary)',
              marginBottom: 8,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              {slide.title}
            </h2>

            {/* Subtitle */}
            <p style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: 1.55,
              marginBottom: 24,
              maxWidth: 280,
              fontWeight: 600,
            }}>
              {slide.subtitle}
            </p>

            {/* Bullets — glass cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
              textAlign: 'left',
            }}>
              {slide.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.07 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--border-subtle)',
                    border: '1px solid var(--surface-hover)',
                  }}
                >
                  <div style={{
                    width: 4, height: 4, borderRadius: 2,
                    background: 'var(--gold-400)',
                    flexShrink: 0,
                    marginTop: 7,
                    boxShadow: '0 0 6px var(--gold-glass-strong)',
                  }} />
                  <span style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
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
        maxWidth: 340,
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        paddingTop: 12,
      }}>
        {/* Step dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16,
        }}>
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 20 : 6,
                background: i === step ? 'var(--gold-400)' : 'var(--surface-active)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                height: 6,
                borderRadius: 3,
                boxShadow: i === step ? '0 0 8px var(--gold-glass-strong)' : 'none',
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
            padding: '15px 24px',
            borderRadius: 12,
            background: isLast
              ? 'var(--gold-metallic)'
              : 'var(--bg-glass)',
            border: isLast
              ? '1px solid var(--gold-glass-strong)'
              : '1px solid var(--border-strong)',
            color: isLast ? 'var(--text-on-gold)' : 'var(--text-secondary)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: isLast ? 'var(--glow-gold)' : 'none',
          }}
        >
          {isLast ? 'Начать' : 'Далее'}
          <ArrowRight size={16} strokeWidth={2.2} />
        </motion.button>
      </div>
    </motion.div>
  )
}

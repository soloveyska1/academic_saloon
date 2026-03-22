import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Fixed thumb-zone conversion bar.
//  Shows after hero scrolls out of viewport (IntersectionObserver).
//  Premium gold gradient button. Micro-reassurance text.
//  Research: sticky CTAs on long-scroll pages prevent attention drift.
// ═══════════════════════════════════════════════════════════════════════════

interface StickyBottomCTAProps {
  onClick: () => void
  /** Ref to the hero CTA element — sticky shows when hero exits viewport */
  heroRef?: React.RefObject<HTMLElement>
}

export const StickyBottomCTA = memo(function StickyBottomCTA({ onClick, heroRef }: StickyBottomCTAProps) {
  const [visible, setVisible] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const target = heroRef?.current
    if (!target) {
      // No hero ref — show after a scroll threshold
      const handleScroll = () => {
        setVisible(window.scrollY > 400)
      }
      // Check initial and find scrollable parent
      const scrollContainer = document.querySelector('[data-scroll-container]')
      if (scrollContainer) {
        const handler = () => setVisible(scrollContainer.scrollTop > 400)
        scrollContainer.addEventListener('scroll', handler, { passive: true })
        return () => scrollContainer.removeEventListener('scroll', handler)
      }
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky when hero is NOT visible
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [heroRef])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            zIndex: 800,
            padding: '12px 20px',
            paddingBottom: 12,
            background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 30%)',
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              width: '100%',
              padding: '17px 24px',
              borderRadius: 16,
              background: 'var(--gold-metallic)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(201, 162, 39, 0.15)',
              cursor: 'pointer',
              appearance: 'none',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-on-gold)',
              letterSpacing: '0.01em',
            }}
          >
            <span>Рассчитать стоимость</span>
            <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.6} />
          </motion.button>

          {/* Micro reassurance */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 8,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.01em',
              opacity: 0.5,
            }}
          >
            Бесплатно · Без предоплаты · Ответ за 5 мин
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

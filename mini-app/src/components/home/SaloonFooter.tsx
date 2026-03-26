import { memo, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GoldText } from '../ui/GoldText'

export const SaloonFooter = memo(function SaloonFooter() {
  const footerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(footerRef, { once: true, margin: '-40px' })

  return (
    <footer
      ref={footerRef}
      style={{
        textAlign: 'center',
        padding: '48px 0 36px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient gold glow — crescendo at the bottom of the page */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute',
          bottom: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(30px)',
        }}
      />

      {/* Gold divider — expands on scroll into view */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={isInView ? { width: 80, opacity: 1 } : { width: 0, opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
        style={{
          height: 1,
          margin: '0 auto 20px',
          background: 'linear-gradient(90deg, transparent, var(--gold-400, #D4AF37), transparent)',
        }}
      />

      {/* Decorative diamond */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
        style={{
          fontSize: 10,
          color: 'var(--gold-400)',
          marginBottom: 14,
        }}
      >
        &#x2726;
      </motion.div>

      {/* Brand mark — serif for gravitas */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <GoldText
          size="sm"
          weight={700}
          variant="static"
          style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            letterSpacing: '0.06em',
            display: 'block',
          }}
        >
          Академический Салон
        </GoldText>
      </motion.div>

      {/* Stats line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        style={{
          marginTop: 10, fontSize: 11, fontWeight: 600,
          color: 'rgba(212,175,55,0.55)', letterSpacing: '0.03em',
        }}
      >
        2 000+ работ · 4.9 ★ · Гарантия возврата
      </motion.div>

      {/* Tagline — serif italic */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        style={{
          marginTop: 6, fontSize: 10,
          fontFamily: "var(--font-display, 'Playfair Display', serif)",
          fontStyle: 'italic',
          color: 'rgba(212,175,55,0.30)',
          letterSpacing: '0.02em',
        }}
      >
        Качество · Конфиденциальность · Результат
      </motion.div>

      {/* Support link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        style={{ marginTop: 16 }}
      >
        <a
          href="https://t.me/Thisissaymoon"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(212,175,55,0.45)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Поддержка в Telegram &rarr;
        </a>
      </motion.div>

      {/* Established year — quiet, final */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.65, duration: 0.5 }}
        style={{
          marginTop: 12,
          fontSize: 9,
          fontWeight: 500,
          color: 'rgba(212,175,55,0.20)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        est. 2020
      </motion.div>
    </footer>
  )
})

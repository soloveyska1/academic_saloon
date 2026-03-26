import { memo } from 'react'
import { motion } from 'framer-motion'
import { Reveal } from '../ui/StaggerReveal'
import { GoldText } from '../ui/GoldText'

export const SaloonFooter = memo(function SaloonFooter() {
  return (
    <Reveal animation="fade" delay={0.3}>
      <footer style={{ textAlign: 'center', padding: '24px 0 20px' }}>
        {/* Gold divider with whileInView animation */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: 40, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
          style={{
            height: 1,
            margin: '0 auto 16px',
            background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
          }}
        />

        {/* Brand mark */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <GoldText size="xs" weight={600} uppercase tracking="wider" variant="static">
            Академический Салон
          </GoldText>
          <span style={{ fontSize: 7, color: 'var(--gold-400)' }}>&#x2726;</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.10em', fontWeight: 600 }}>
            est. 2020
          </span>
        </div>

        {/* Stats line — honest, rounded */}
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 600,
          color: 'rgba(212,175,55,0.35)', letterSpacing: '0.02em',
        }}>
          Более 2 000 работ · Оценка 4.9 · Возврат гарантирован
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 6, fontSize: 10,
          color: 'var(--text-muted)', letterSpacing: '0.02em',
        }}>
          Качество · Конфиденциальность · Результат
        </div>

        {/* Support link */}
        <div style={{ marginTop: 12 }}>
          <a
            href="https://t.me/AcademicSaloonBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(212,175,55,0.40)',
              textDecoration: 'none',
            }}
          >
            Поддержка в Telegram →
          </a>
        </div>
      </footer>
    </Reveal>
  )
})

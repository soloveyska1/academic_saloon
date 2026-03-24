import { memo } from 'react'
import { Reveal } from '../ui/StaggerReveal'
import { GoldText } from '../ui/GoldText'

export const SaloonFooter = memo(function SaloonFooter() {
  return (
    <Reveal animation="fade" delay={0.3}>
      <footer style={{ textAlign: 'center', padding: '32px 0 20px' }}>
        {/* Gold divider line */}
        <div
          aria-hidden="true"
          style={{
            width: 40,
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
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.10em',
              fontWeight: 600,
            }}
          >
            с 2020
          </span>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          Качество · Конфиденциальность · Результат
        </div>
      </footer>
    </Reveal>
  )
})

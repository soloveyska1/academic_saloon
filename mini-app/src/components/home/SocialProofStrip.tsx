import { memo } from 'react'
import { motion } from 'framer-motion'
import { Shield, Clock, Award, Users } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  SOCIAL PROOF STRIP — Trust signals for new users
//  Shows key metrics: Years of experience, orders, personal approach
// ═══════════════════════════════════════════════════════════════════════════

interface SocialProofStripProps {
  variant?: 'compact' | 'full'
}

interface ProofItem {
  icon: React.ElementType
  value: string
  label: string
  highlight?: boolean
}

const PROOF_ITEMS: ProofItem[] = [
  {
    icon: Clock,
    value: '6 лет',
    label: 'опыта',
    highlight: true,
  },
  {
    icon: Award,
    value: '99%',
    label: 'успешно',
  },
  {
    icon: Users,
    value: '1 на 1',
    label: 'подход',
  },
  {
    icon: Shield,
    value: '100%',
    label: 'гарантия',
  },
]

export const SocialProofStrip = memo(function SocialProofStrip({
  variant = 'compact',
}: SocialProofStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        padding: variant === 'full' ? '12px 16px' : '8px 12px',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(20,20,23,0.4) 50%, rgba(212,175,55,0.04) 100%)',
        borderRadius: 12,
        border: '1px solid rgba(212,175,55,0.15)',
      }}
    >
      {PROOF_ITEMS.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            position: 'relative',
          }}
        >
          {/* Divider between items */}
          {index > 0 && (
            <div
              style={{
                position: 'absolute',
                left: -4,
                top: '15%',
                height: '70%',
                width: 1,
                background: 'rgba(212,175,55,0.2)',
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <item.icon
              size={12}
              strokeWidth={2}
              style={{
                color: item.highlight ? 'var(--gold-400)' : 'var(--text-muted)',
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                background: item.highlight
                  ? 'var(--gold-metallic)'
                  : 'none',
                WebkitBackgroundClip: item.highlight ? 'text' : 'unset',
                WebkitTextFillColor: item.highlight ? 'transparent' : 'var(--text-main)',
                color: item.highlight ? 'transparent' : 'var(--text-main)',
              }}
            >
              {item.value}
            </span>
          </div>

          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            {item.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  )
})

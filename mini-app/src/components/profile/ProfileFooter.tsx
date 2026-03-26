import { memo } from 'react'
import { motion } from 'framer-motion'
import { LifeBuoy, ScrollText } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { prefersReducedMotion } from './profileHelpers'

interface Props {
  onOpenSupport: () => void
  onOpenLegalHub?: () => void
}

export const ProfileFooter = memo(function ProfileFooter({
  onOpenSupport,
  onOpenLegalHub,
}: Props) {
  return (
    <motion.footer
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.32 }}
      className={s.footer}
    >
      {/* Support + Offer links */}
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenSupport}
          className={s.goldButton}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LifeBuoy size={14} />
          Поддержка
        </motion.button>

        {onOpenLegalHub && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onOpenLegalHub}
            className={s.goldButton}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <ScrollText size={14} />
            Документы
          </motion.button>
        )}
      </div>

      {/* Brand footer */}
      <div className={s.footerBrand}>
        <div className={s.footerLine} />
        <span style={{
          fontSize: 9,
          color: 'var(--gold-label)',
          letterSpacing: '0.15em',
          fontFamily: "var(--font-serif, 'Playfair Display', serif)",
        }}>
          АКАДЕМИЧЕСКИЙ САЛОН
        </span>
        <span style={{ fontSize: 8, color: 'var(--gold-label)' }}>✦</span>
        <span style={{
          fontSize: 8,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}>
          EST. {new Date().getFullYear()}
        </span>
        <div className={`${s.footerLine} ${s.footerLineRight}`} />
      </div>
    </motion.footer>
  )
})

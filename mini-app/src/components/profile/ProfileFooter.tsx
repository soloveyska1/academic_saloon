import { memo } from 'react'
import { motion } from 'framer-motion'
import { LifeBuoy } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { prefersReducedMotion } from './profileHelpers'

interface Props {
  onOpenSupport: () => void
}

export const ProfileFooter = memo(function ProfileFooter({ onOpenSupport }: Props) {
  return (
    <motion.footer
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.32 }}
      className={s.footer}
    >
      {/* Support link */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onOpenSupport}
        className={s.goldButton}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <LifeBuoy size={14} />
        Поддержка и сервис
      </motion.button>

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

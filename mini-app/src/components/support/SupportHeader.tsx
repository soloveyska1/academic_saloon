import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import s from '../../pages/SupportPage.module.css'

interface Props {
  onBack: () => void
  onOpenTelegram: () => void
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SupportHeader = memo(function SupportHeader({ onBack, onOpenTelegram }: Props) {
  return (
    <motion.header
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={s.headerRow}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          aria-label="Назад"
          className={s.backButton}
        >
          <ArrowLeft size={18} color="var(--text-main)" />
        </motion.button>

        <div>
          <div className={s.headerLabel}>Центр помощи</div>
          <h1 className={s.headerTitle}>
            Всё по заказу в одном месте
          </h1>
          <div className={s.headerSubtitle}>
            Быстрые ответы, чат поддержки и прямой переход в Telegram, если нужен внешний канал.
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onOpenTelegram}
        className={s.telegramButton}
      >
        <ExternalLink size={16} />
        Telegram
      </motion.button>
    </motion.header>
  )
})

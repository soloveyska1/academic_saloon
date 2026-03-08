import { memo } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { SupportChat } from './SupportChat'
import s from '../../pages/SupportPage.module.css'

interface Props {
  onOpenTelegram: () => void
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SupportChatView = memo(function SupportChatView({ onOpenTelegram }: Props) {
  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={s.chatContainer}
    >
      {/* Chat header bar */}
      <div className={s.chatHeader}>
        <div className={s.chatHeaderInfo}>
          <ShieldCheck size={18} color="#d4af37" />
          <div>
            <div className={s.chatHeaderTitle}>Чат поддержки</div>
            <div className={s.chatHeaderSub}>По оплате, срокам, правкам и файлам</div>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenTelegram}
          className={s.chatTelegramMini}
        >
          <ExternalLink size={14} />
          Telegram
        </motion.button>
      </div>

      {/* Hints bar */}
      <div className={s.chatHints}>
        <div className={s.chatHint}>Ответ обычно до 10 минут</div>
        <div className={s.chatHint}>Можно писать текстом и присылать файлы</div>
        <div className={s.chatHint}>Если нужно, переведём разговор в Telegram</div>
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SupportChat />
      </div>
    </motion.section>
  )
})

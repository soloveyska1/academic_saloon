import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock3,
  CreditCard,
  FileText,
  Headphones,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import s from '../../pages/SupportPage.module.css'

type ViewType = 'faq' | 'chat'

interface Props {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  onOpenFaq: (faqId: string) => void
}

const TOPICS = [
  { id: 'payment', icon: CreditCard, title: 'Оплата', description: 'Показываем, где оплатить и что делать, если подтверждение задержалось.' },
  { id: 'deadline', icon: Clock3, title: 'Сроки', description: 'Подскажем, как вести срочный заказ и что делать при истечении срока.' },
  { id: 'revisions', icon: RefreshCcw, title: 'Правки', description: 'Коротко объясняем, как идут бесплатные круги правок и когда нужен отдельный расчёт.' },
  { id: 'files', icon: FileText, title: 'Файлы', description: 'Помогаем с загрузкой методички, требований, примеров и ссылок.' },
] as const

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SupportQuickHelp = memo(function SupportQuickHelp({
  activeView,
  onViewChange,
  onOpenFaq,
}: Props) {
  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={s.heroCard}
    >
      {/* Hero header */}
      <div className={s.heroHeader}>
        <div className={s.heroIcon}>
          <Headphones size={22} color="#d4af37" />
        </div>
        <div>
          <div className={s.heroTitle}>Помощь без лишних переходов</div>
          <div className={s.heroDescription}>
            Сначала можно быстро посмотреть готовый ответ, а если вопрос нестандартный или срочный, сразу перейти в чат поддержки.
          </div>
        </div>
      </div>

      {/* Topic cards grid */}
      <div className={s.topicGrid}>
        {TOPICS.map((topic) => (
          <TopicCard
            key={topic.id}
            icon={topic.icon}
            title={topic.title}
            description={topic.description}
            onClick={() => onOpenFaq(topic.id)}
          />
        ))}
      </div>

      {/* Segmented control */}
      <div className={s.segmentedRow}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => onViewChange('faq')}
          className={`${s.segmentedButton} ${activeView === 'faq' ? s.segmentedActive : ''}`}
        >
          <ShieldCheck size={16} />
          Быстрые ответы
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => onViewChange('chat')}
          className={`${s.segmentedButton} ${activeView === 'chat' ? s.segmentedActive : ''}`}
        >
          <MessageCircle size={16} />
          Чат поддержки
        </motion.button>
      </div>
    </motion.section>
  )
})

/* ─── Topic Card ─── */

function TopicCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={s.topicCard}
    >
      <div className={s.topicCardInner}>
        <div className={s.topicIcon}>
          <Icon size={18} color="#d4af37" />
        </div>
        <div>
          <div className={s.topicTitle}>{title}</div>
          <div className={s.topicDescription}>{description}</div>
        </div>
      </div>
    </motion.button>
  )
}

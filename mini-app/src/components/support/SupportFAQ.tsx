import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  RefreshCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import s from '../../pages/SupportPage.module.css'

interface FaqItemData {
  id: string
  icon: LucideIcon
  title: string
  answer: string
}

const FAQ_ITEMS: FaqItemData[] = [
  {
    id: 'payment',
    icon: CreditCard,
    title: 'Как проходит оплата и когда стартует заказ?',
    answer:
      'После расчёта стоимости вы оплачиваете заказ внутри карточки. Как только платёж подтверждён, заказ сразу переходит в работу.',
  },
  {
    id: 'deadline',
    icon: Clock3,
    title: 'Что делать, если срок горит или уже истёк?',
    answer:
      'Для срочных задач лучше сразу написать в чат поддержки. Мы проверим, можно ли сохранить текущую цену и срок, или предложим новый сценарий.',
  },
  {
    id: 'revisions',
    icon: RefreshCcw,
    title: 'Как работают правки и гарантии?',
    answer:
      'В заказ входит 3 бесплатных круга правок. Если работа ещё не начата, можно остановить заказ. После старта доводим результат до согласованного состояния.',
  },
  {
    id: 'files',
    icon: FileText,
    title: 'Куда прикреплять методичку, примеры и требования?',
    answer:
      'Все материалы добавляются прямо в заявке и затем остаются внутри заказа. Если что-то не прикрепилось, напишите в чат поддержки и мы быстро проверим загрузку.',
  },
]

interface Props {
  expandedFaq: string
  onToggleFaq: (faqId: string) => void
  onOpenChat: () => void
  onOpenTelegram: () => void
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SupportFAQ = memo(function SupportFAQ({
  expandedFaq,
  onToggleFaq,
  onOpenChat,
  onOpenTelegram,
}: Props) {
  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {FAQ_ITEMS.map((item) => (
        <FaqItemRow
          key={item.id}
          item={item}
          expanded={expandedFaq === item.id}
          onToggle={onToggleFaq}
        />
      ))}

      {/* Not found CTA */}
      <div className={s.notFoundCard}>
        <div className={s.notFoundTitle}>Не нашли свой вопрос?</div>
        <div className={s.notFoundText}>
          Откройте чат поддержки в этом же разделе. Переписка сохранится внутри приложения, а если удобнее, можно перейти в Telegram.
        </div>
        <div className={s.notFoundActions}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onOpenChat}
            className={s.primaryButton}
          >
            Открыть чат
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onOpenTelegram}
            className={s.secondaryButton}
          >
            Telegram
          </motion.button>
        </div>
      </div>
    </motion.section>
  )
})

/* ─── FAQ Item Row ─── */

const FaqItemRow = memo(function FaqItemRow({
  item,
  expanded,
  onToggle,
}: {
  item: FaqItemData
  expanded: boolean
  onToggle: (id: string) => void
}) {
  const Icon = item.icon

  const handleClick = useCallback(() => {
    onToggle(item.id)
  }, [item.id, onToggle])

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={`${s.faqItem} ${expanded ? s.faqItemExpanded : ''}`}
    >
      <div className={s.faqHeader}>
        <div className={s.faqIcon}>
          <Icon size={18} color="#d4af37" />
        </div>
        <div className={s.faqTitle}>{item.title}</div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="rgba(255,255,255,0.55)" />
        </motion.div>
      </div>

      {expanded && (
        <div className={s.faqAnswer}>{item.answer}</div>
      )}
    </motion.button>
  )
})

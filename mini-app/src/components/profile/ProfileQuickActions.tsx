import { memo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Gift, LifeBuoy, LucideIcon } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { formatCountWithWord, prefersReducedMotion, toSafeNumber } from './profileHelpers'

interface ActionItem {
  icon: LucideIcon
  label: string
  hint: string
  color: string
  background: string
  border: string
  onClick: () => void
}

interface Props {
  ordersCount: number
  onOpenOrders: () => void
  onOpenSupport: () => void
  onOpenClub: () => void
}

export const ProfileQuickActions = memo(function ProfileQuickActions({
  ordersCount,
  onOpenOrders,
  onOpenSupport,
  onOpenClub,
}: Props) {
  const count = toSafeNumber(ordersCount)

  const actions: ActionItem[] = [
    {
      icon: BookOpen,
      label: 'Заказы',
      hint: formatCountWithWord(count, 'заказ', 'заказа', 'заказов'),
      color: 'var(--gold-400)',
      background: 'var(--gold-glass-subtle)',
      border: 'var(--border-gold)',
      onClick: onOpenOrders,
    },
    {
      icon: LifeBuoy,
      label: 'Поддержка',
      hint: 'Связаться',
      color: 'var(--accent-blue)',
      background: 'var(--accent-blue-glass)',
      border: 'var(--accent-blue-border)',
      onClick: onOpenSupport,
    },
    {
      icon: Gift,
      label: 'Бонусы',
      hint: 'Кэшбэк',
      color: 'var(--accent-green)',
      background: 'var(--accent-green-glass)',
      border: 'var(--accent-green-border)',
      onClick: onOpenClub,
    },
  ]

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      <div className={s.quickActionsRow}>
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            type="button"
            whileTap={{ scale: 0.95 }}
            className={s.quickActionItem}
            onClick={action.onClick}
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.12 + i * 0.06 }}
          >
            <div
              className={s.quickActionIcon}
              style={{
                background: action.background,
                border: `1px solid ${action.border}`,
              }}
            >
              <action.icon size={20} color={action.color} />
            </div>
            <span className={s.quickActionLabel}>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
})

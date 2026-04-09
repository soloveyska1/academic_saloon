import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import {
  formatDeadline,
  formatCompactDate,
  formatPauseUntil,
  formatMoney,
  getActionableOrderMeta,
  getCurrentRevisionRound,
  getEffectiveProfileOrderStatus,
  getOrderDisplayTitle,
  getLatestDelivery,
  getRemainingAmount,
  prefersReducedMotion,
} from './profileHelpers'
import type { Order } from '../../types'
import { isAwaitingPaymentStatus } from '../../lib/orderView'

interface Props {
  order: Order
  onClick: () => void
}

export const ActionableOrderBanner = memo(function ActionableOrderBanner({ order, onClick }: Props) {
  const meta = getActionableOrderMeta(order)
  if (!meta) return null
  const currentRound = getCurrentRevisionRound(order)
  const latestDelivery = getLatestDelivery(order)
  const status = getEffectiveProfileOrderStatus(order)
  const latestVersionLabel = latestDelivery?.version_number ? `Версия ${latestDelivery.version_number}` : 'Последняя версия'

  const Icon = meta.icon
  const title = meta.title
  const orderTitle = getOrderDisplayTitle(order)

  const footnote =
    currentRound
      ? `${currentRound.round_number ? `Правка #${currentRound.round_number}` : 'Правка'} активна${currentRound.last_client_activity_at ? ` · активность ${formatCompactDate(currentRound.last_client_activity_at)}` : ''}`
      : status === 'paused'
      ? `Заморозка активна ${formatPauseUntil(order.pause_until)}`
      : isAwaitingPaymentStatus(status)
      ? `К оплате ${formatMoney(getRemainingAmount(order))}${order.deadline ? ` · срок ${formatDeadline(order.deadline)}` : ''}`
      : status === 'review' && latestDelivery
        ? `${latestVersionLabel}${latestDelivery.sent_at ? ` · отправлена ${formatCompactDate(latestDelivery.sent_at)}` : ''}`
      : order.deadline
        ? `Срок: ${formatDeadline(order.deadline)}`
        : 'Откройте, чтобы не потерять следующий шаг'

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={s.bannerCard}
      style={{
        width: '100%',
        marginBottom: 24,
        textAlign: 'left',
        borderLeftColor: meta.color,
        borderLeftWidth: 3,
      }}
    >
      <div className={s.bannerShine} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header row: icon + title + arrow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `${meta.color}20`,
            border: `1px solid ${meta.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} color={meta.color} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15.5,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 2,
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {orderTitle}
            </div>
          </div>

          <div className={s.bannerArrow}>
            <ArrowUpRight size={18} color="var(--text-on-gold)" strokeWidth={2.6} />
          </div>
        </div>

        {/* Footnote */}
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          {footnote}
        </div>
      </div>
    </motion.button>
  )
})

import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import {
  ACTIONABLE_ORDER_META,
  formatDeadline,
  formatMoney,
  getOrderDisplayTitle,
  getRemainingAmount,
  prefersReducedMotion,
} from './profileHelpers'
import type { Order } from '../../types'

interface Props {
  order: Order
  onClick: () => void
}

export const ActionableOrderBanner = memo(function ActionableOrderBanner({ order, onClick }: Props) {
  const meta = ACTIONABLE_ORDER_META[order.status]
  if (!meta) return null

  const Icon = meta.icon
  const title = meta.title
  const orderTitle = getOrderDisplayTitle(order)

  const footnote =
    order.status === 'confirmed' || order.status === 'waiting_payment'
      ? `К оплате ${formatMoney(getRemainingAmount(order))}${order.deadline ? ` · срок ${formatDeadline(order.deadline)}` : ''}`
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
        marginBottom: 20,
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
          marginBottom: 10,
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 14,
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
              fontWeight: 800,
              color: '#faf7e3',
              marginBottom: 2,
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 13,
              color: '#d4d4d8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {orderTitle}
            </div>
          </div>

          <div className={s.bannerArrow}>
            <ArrowUpRight size={18} color="#09090b" strokeWidth={2.6} />
          </div>
        </div>

        {/* Footnote */}
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#a1a1aa',
          lineHeight: 1.5,
        }}>
          {footnote}
        </div>
      </div>
    </motion.button>
  )
})

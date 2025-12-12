import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Clock, CheckCircle, User, FileText, ChevronRight } from 'lucide-react'
import { AgentEarning } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  EARNINGS HISTORY - Agent's earnings from referrals
// ═══════════════════════════════════════════════════════════════════════════════

interface EarningsHistoryProps {
  earnings: AgentEarning[]
  onViewOrder?: (orderId: number) => void
}

function formatCurrency(amount: number): string {
  return '+' + new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const EarningItem = memo(function EarningItem({
  earning,
  index,
  onViewOrder,
}: {
  earning: AgentEarning
  index: number
  onViewOrder?: (orderId: number) => void
}) {
  const isPending = earning.status === 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={onViewOrder ? { scale: 0.98 } : {}}
      onClick={() => onViewOrder?.(earning.orderId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        cursor: onViewOrder ? 'pointer' : 'default',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isPending ? 'rgba(212, 175, 55, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TrendingUp size={18} color={isPending ? '#D4AF37' : '#22c55e'} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <User size={12} color="rgba(255, 255, 255, 0.5)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            {earning.referralName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={10} color="rgba(255, 255, 255, 0.4)" />
            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
              Заказ #{earning.orderId}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
            {formatDate(earning.date)}
          </span>
        </div>
      </div>

      {/* Amount and status */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#22c55e' }}>
          {formatCurrency(earning.amount)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
          {isPending ? (
            <>
              <Clock size={10} color="#D4AF37" />
              <span style={{ fontSize: 10, color: '#D4AF37' }}>Ожидает</span>
            </>
          ) : (
            <>
              <CheckCircle size={10} color="#22c55e" />
              <span style={{ fontSize: 10, color: '#22c55e' }}>Выплачено</span>
            </>
          )}
        </div>
      </div>

      {onViewOrder && (
        <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" style={{ flexShrink: 0 }} />
      )}
    </motion.div>
  )
})

const EmptyEarnings = memo(function EmptyEarnings() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px',
          borderRadius: 14,
          background: 'rgba(167, 139, 250, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TrendingUp size={24} color="#A78BFA" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>
        Пока нет начислений
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
        Приглашайте друзей и получайте комиссию с их заказов
      </div>
    </motion.div>
  )
})

export const EarningsHistory = memo(function EarningsHistory({
  earnings,
  onViewOrder,
}: EarningsHistoryProps) {
  // Calculate totals
  const pendingTotal = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0)
  const paidTotal = earnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
          История начислений
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
          {earnings.length} операций
        </span>
      </div>

      {/* Summary row */}
      {earnings.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {/* Pending */}
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Clock size={12} color="#D4AF37" />
              <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                Ожидает
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#D4AF37' }}>
              {formatCurrency(pendingTotal)}
            </div>
          </div>

          {/* Paid */}
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <CheckCircle size={12} color="#22c55e" />
              <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                Выплачено
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#22c55e' }}>
              {formatCurrency(paidTotal)}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {earnings.length === 0 ? (
        <EmptyEarnings />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {earnings.map((earning, idx) => (
              <EarningItem
                key={earning.id}
                earning={earning}
                index={idx}
                onViewOrder={onViewOrder}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
})

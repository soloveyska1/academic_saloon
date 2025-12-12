import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Gift, Percent, Users, Settings, ChevronRight, Filter } from 'lucide-react'
import { ProfileTransaction, TransactionCategory } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION LIST - Filtered transaction history with details
// ═══════════════════════════════════════════════════════════════════════════════

interface TransactionListProps {
  transactions: ProfileTransaction[]
  onTransactionClick?: (transaction: ProfileTransaction) => void
}

const FILTER_TABS: { id: TransactionCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'bonus', label: 'Бонусы' },
  { id: 'cashback', label: 'Кэшбэк' },
  { id: 'referral', label: 'Рефералы' },
  { id: 'adjustment', label: 'Корректировки' },
]

const getCategoryIcon = (category: TransactionCategory) => {
  switch (category) {
    case 'bonus':
      return <Gift size={14} />
    case 'cashback':
      return <Percent size={14} />
    case 'referral':
      return <Users size={14} />
    case 'adjustment':
      return <Settings size={14} />
    default:
      return null
  }
}

const getCategoryColor = (category: TransactionCategory): string => {
  switch (category) {
    case 'bonus':
      return '#D4AF37'
    case 'cashback':
      return '#22c55e'
    case 'referral':
      return '#A78BFA'
    case 'adjustment':
      return '#6B7280'
    default:
      return '#9CA3AF'
  }
}

function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return sign + new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
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

// Single transaction item
const TransactionItem = memo(function TransactionItem({
  transaction,
  onClick,
}: {
  transaction: ProfileTransaction
  onClick?: () => void
}) {
  const isCredit = transaction.type === 'credit'
  const color = getCategoryColor(transaction.category)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}
      >
        {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {transaction.title}
          </span>
          {transaction.category !== 'all' && (
            <span style={{ color: color, opacity: 0.7 }}>
              {getCategoryIcon(transaction.category)}
            </span>
          )}
        </div>
        {transaction.subtitle && (
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {transaction.subtitle}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', marginTop: 4 }}>
          {formatDate(transaction.date)}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: isCredit ? '#22c55e' : '#ef4444',
          }}
        >
          {formatCurrency(transaction.amount)}
        </div>
      </div>

      {/* Chevron for clickable items */}
      {onClick && (
        <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" style={{ flexShrink: 0 }} />
      )}
    </motion.div>
  )
})

export const TransactionList = memo(function TransactionList({
  transactions,
  onTransactionClick,
}: TransactionListProps) {
  const [activeFilter, setActiveFilter] = useState<TransactionCategory>('all')

  const filteredTransactions = activeFilter === 'all'
    ? transactions
    : transactions.filter(t => t.category === activeFilter)

  const handleFilterChange = useCallback((filter: TransactionCategory) => {
    setActiveFilter(filter)
  }, [])

  return (
    <div>
      {/* Header with filter */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
            История операций
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255, 255, 255, 0.5)' }}>
            <Filter size={14} />
            <span style={{ fontSize: 12 }}>{filteredTransactions.length}</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {FILTER_TABS.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: activeFilter === tab.id
                  ? 'rgba(212, 175, 55, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: activeFilter === tab.id ? '#D4AF37' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: 14,
              }}
            >
              Нет операций в этой категории
            </motion.div>
          ) : (
            filteredTransactions.map((transaction, idx) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onClick={onTransactionClick ? () => onTransactionClick(transaction) : undefined}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

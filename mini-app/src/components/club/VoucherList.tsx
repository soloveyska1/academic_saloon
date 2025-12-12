import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Clock, Check, X, ChevronRight, AlertCircle } from 'lucide-react'
import { Voucher, VoucherStatus } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  VOUCHER LIST - User's active vouchers
// ═══════════════════════════════════════════════════════════════════════════════

interface VoucherListProps {
  vouchers: Voucher[]
  onApply?: (voucher: Voucher) => void
}

function formatExpiryDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days <= 0) return 'Истёк'
  if (days === 1) return 'Истекает сегодня'
  if (days <= 3) return `Истекает через ${days} дня`
  if (days <= 7) return `Истекает через ${days} дней`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const getStatusStyles = (status: VoucherStatus) => {
  switch (status) {
    case 'active':
      return {
        bg: 'rgba(212, 175, 55, 0.1)',
        border: 'rgba(212, 175, 55, 0.2)',
        icon: <Ticket size={18} color="#D4AF37" />,
        color: '#D4AF37',
        label: 'Активен',
      }
    case 'used':
      return {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.2)',
        icon: <Check size={18} color="#22c55e" />,
        color: '#22c55e',
        label: 'Использован',
      }
    case 'expired':
      return {
        bg: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.1)',
        icon: <X size={18} color="rgba(255,255,255,0.4)" />,
        color: 'rgba(255,255,255,0.4)',
        label: 'Истёк',
      }
  }
}

export const VoucherList = memo(function VoucherList({
  vouchers,
  onApply,
}: VoucherListProps) {
  const activeVouchers = vouchers.filter(v => v.status === 'active')
  const inactiveVouchers = vouchers.filter(v => v.status !== 'active')

  if (vouchers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: 40,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Ticket size={28} color="rgba(255, 255, 255, 0.3)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
          Нет ваучеров
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>
          Обменяйте баллы на награды в магазине
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Active vouchers */}
      <AnimatePresence>
        {activeVouchers.map((voucher, idx) => {
          const styles = getStatusStyles(voucher.status)
          const expiresAt = new Date(voucher.expiresAt)
          const now = new Date()
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const isExpiringSoon = daysLeft <= 3

          return (
            <motion.div
              key={voucher.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                background: styles.bg,
                border: `1px solid ${styles.border}`,
              }}
            >
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${styles.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {styles.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                      {voucher.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8 }}>
                      {voucher.description}
                    </div>

                    {/* Expiry */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpiringSoon && voucher.status === 'active' && (
                        <AlertCircle size={12} color="#F59E0B" />
                      )}
                      <Clock size={12} color={isExpiringSoon ? '#F59E0B' : 'rgba(255,255,255,0.4)'} />
                      <span
                        style={{
                          fontSize: 12,
                          color: isExpiringSoon ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {formatExpiryDate(voucher.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply rules */}
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {voucher.applyRules}
                </div>

                {/* Apply button */}
                {onApply && voucher.status === 'active' && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      try {
                        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
                      } catch {}
                      onApply(voucher)
                    }}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1d' }}>
                      Применить к заказу
                    </span>
                    <ChevronRight size={16} color="#1a1a1d" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Inactive vouchers (collapsed) */}
      {inactiveVouchers.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            История
          </div>
          {inactiveVouchers.map((voucher, idx) => {
            const styles = getStatusStyles(voucher.status)

            return (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  marginBottom: 6,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  opacity: 0.6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: styles.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {voucher.status === 'used' ? (
                    <Check size={14} color={styles.color} />
                  ) : (
                    <X size={14} color={styles.color} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255, 255, 255, 0.6)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {voucher.title}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: styles.color }}>
                  {styles.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
})

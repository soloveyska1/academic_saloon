import { memo } from 'react'
import { motion } from 'framer-motion'
import { Ticket, Clock, ChevronRight, Sparkles, CheckCircle, XCircle, Gift } from 'lucide-react'
import { Voucher, VoucherStatus } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE VOUCHER LIST - User's vouchers in profile tab
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfileVoucherListProps {
  vouchers: Voucher[]
  onVoucherClick: (voucher: Voucher) => void
  onGoToClub: () => void
}

const getStatusConfig = (status: VoucherStatus) => {
  switch (status) {
    case 'active':
      return { label: 'Активен', color: '#22c55e', icon: <Sparkles size={12} /> }
    case 'used':
      return { label: 'Использован', color: '#6B7280', icon: <CheckCircle size={12} /> }
    case 'expired':
      return { label: 'Истёк', color: '#ef4444', icon: <XCircle size={12} /> }
  }
}

function formatExpiryDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Истёк'
  if (diffDays === 1) return 'Истекает завтра'
  if (diffDays <= 3) return `Осталось ${diffDays} дн.`
  if (diffDays <= 7) return `Осталось ${diffDays} дней`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Single voucher card
const VoucherCard = memo(function VoucherCard({
  voucher,
  onClick,
  index,
}: {
  voucher: Voucher
  onClick: () => void
  index: number
}) {
  const statusConfig = getStatusConfig(voucher.status)
  const isActive = voucher.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: isActive
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 18, 21, 0.95) 100%)'
          : 'rgba(18, 18, 21, 0.95)',
        border: isActive
          ? '1px solid rgba(212, 175, 55, 0.2)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        cursor: 'pointer',
        opacity: voucher.status === 'expired' ? 0.6 : 1,
      }}
    >
      {/* Premium accent for active */}
      {isActive && (
        <div
          style={{
            height: 2,
            background: 'linear-gradient(90deg, #BF953F 0%, #FCF6BA 50%, #D4AF37 100%)',
          }}
        />
      )}

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Icon */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ticket size={20} color={isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)'} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {voucher.title}
              </span>
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {voucher.description}
            </div>

            {/* Status and expiry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Status badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: `${statusConfig.color}15`,
                }}
              >
                <span style={{ color: statusConfig.color }}>{statusConfig.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: statusConfig.color }}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Expiry */}
              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="rgba(255, 255, 255, 0.4)" />
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                    {formatExpiryDate(voucher.expiresAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" style={{ flexShrink: 0 }} />
        </div>
      </div>
    </motion.div>
  )
})

// Empty state
const EmptyVouchers = memo(function EmptyVouchers({ onGoToClub }: { onGoToClub: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 32,
        borderRadius: 20,
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 16px',
          borderRadius: 16,
          background: 'rgba(212, 175, 55, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Gift size={28} color="#D4AF37" />
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
        У вас пока нет ваучеров
      </div>

      <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 20, lineHeight: 1.5 }}>
        Обменивайте баллы на ваучеры в магазине наград Клуба Привилегий
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onGoToClub}
        style={{
          padding: '12px 24px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #BF953F 0%, #D4AF37 100%)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1d' }}>
          Перейти в Клуб
        </span>
      </motion.button>
    </motion.div>
  )
})

export const ProfileVoucherList = memo(function ProfileVoucherList({
  vouchers,
  onVoucherClick,
  onGoToClub,
}: ProfileVoucherListProps) {
  // Separate active and inactive vouchers
  const activeVouchers = vouchers.filter(v => v.status === 'active')
  const inactiveVouchers = vouchers.filter(v => v.status !== 'active')

  if (vouchers.length === 0) {
    return <EmptyVouchers onGoToClub={onGoToClub} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
          Мои ваучеры
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onGoToClub}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(212, 175, 55, 0.1)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: '#D4AF37' }}>
            В магазин
          </span>
          <ChevronRight size={14} color="#D4AF37" />
        </motion.button>
      </div>

      {/* Active vouchers */}
      {activeVouchers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Активные ({activeVouchers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeVouchers.map((voucher, idx) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onClick={() => onVoucherClick(voucher)}
                index={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive vouchers */}
      {inactiveVouchers.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Использованные / Истёкшие ({inactiveVouchers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inactiveVouchers.map((voucher, idx) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onClick={() => onVoucherClick(voucher)}
                index={activeVouchers.length + idx}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

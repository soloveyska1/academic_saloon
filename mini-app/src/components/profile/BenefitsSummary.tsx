import { memo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Percent, BadgePercent, PiggyBank, HelpCircle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  BENEFITS SUMMARY - Consolidated view of user's financial benefits
// ═══════════════════════════════════════════════════════════════════════════════

interface BenefitsSummaryProps {
  balance: number
  bonusBalance: number
  cashbackPercent: number
  discountPercent: number
  savedLast30Days: number
  onHowItWorks: () => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
}

export const BenefitsSummary = memo(function BenefitsSummary({
  balance,
  bonusBalance,
  cashbackPercent,
  discountPercent,
  savedLast30Days,
  onHowItWorks,
}: BenefitsSummaryProps) {
  const totalBalance = balance + bonusBalance

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PiggyBank size={18} color="#22c55e" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
              Ваша выгода
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onHowItWorks}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
            }}
          >
            <HelpCircle size={14} color="rgba(255, 255, 255, 0.5)" />
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Как это работает?
            </span>
          </motion.button>
        </div>

        {/* Main balance */}
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
            Доступный баланс
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
          {bonusBalance > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
              из них бонусов: {formatCurrency(bonusBalance)}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {/* Cashback */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Percent size={14} color="#D4AF37" />
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                Кэшбэк
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#D4AF37' }}>
              {cashbackPercent}%
            </div>
          </div>

          {/* Discount */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <BadgePercent size={14} color="#3B82F6" />
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                Скидка
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
              {discountPercent}%
            </div>
          </div>
        </div>

        {/* Saved amount */}
        {savedLast30Days > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Wallet size={16} color="#D4AF37" />
            <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
              Сэкономлено за 30 дней:{' '}
              <span style={{ fontWeight: 600, color: '#D4AF37' }}>
                {formatCurrency(savedLast30Days)}
              </span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
})

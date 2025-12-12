import { useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Ticket, ShoppingBag } from 'lucide-react'
import { Voucher } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { VoucherList } from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  MY VOUCHERS PAGE - Active and past vouchers
// ═══════════════════════════════════════════════════════════════════════════════

// Mock vouchers for demo
const MOCK_VOUCHERS: Voucher[] = [
  {
    id: 'v1',
    rewardId: 'priority-queue',
    title: 'Приоритет в очереди',
    description: 'Ваш заказ будет обработан первым',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applyRules: 'Применяется автоматически к следующему заказу. Не суммируется с другими приоритетами.',
  },
  {
    id: 'v2',
    rewardId: 'template-basic',
    title: 'Шаблон оформления',
    description: 'Готовый шаблон по ГОСТ',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applyRules: 'Доступен для скачивания в личном кабинете.',
  },
  {
    id: 'v3',
    rewardId: 'discount-5-options',
    title: '5% на опции',
    description: 'Скидка на дополнительные услуги',
    expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    applyRules: 'Срок действия истёк.',
  },
  {
    id: 'v4',
    rewardId: 'fast-estimation',
    title: 'Быстрая оценка',
    description: 'Оценка за 1 час',
    expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'used',
    applyRules: 'Использован для заказа #1234.',
  },
]

// Header
const VouchersHeader = memo(function VouchersHeader({
  onBack,
  activeCount,
}: {
  onBack: () => void
  activeCount: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="rgba(255, 255, 255, 0.7)" />
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ticket size={20} color="#D4AF37" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Мои ваучеры
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              {activeCount > 0 ? `${activeCount} активных` : 'Нет активных'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

function MyVouchersPage() {
  const navigate = useNavigate()

  // State
  const [vouchers, setVouchers] = useState<Voucher[]>(MOCK_VOUCHERS)

  const activeCount = vouchers.filter(v => v.status === 'active').length

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/club')
  }, [navigate])

  const handleApplyVoucher = useCallback((voucher: Voucher) => {
    // Haptic feedback
    try {
      window.Telegram?.WebApp.HapticFeedback.impactOccurred('medium')
    } catch {}

    // In real app, would navigate to order creation with voucher pre-applied
    navigate('/create-order', { state: { voucherId: voucher.id } })
  }, [navigate])

  const handleGoToStore = useCallback(() => {
    navigate('/club/rewards')
  }, [navigate])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0a0a0c',
      }}
    >
      {/* Premium background */}
      <PremiumBackground />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingBottom: 120,
        }}
      >
        {/* Header */}
        <VouchersHeader onBack={handleBack} activeCount={activeCount} />

        {/* Voucher list */}
        <VoucherList
          vouchers={vouchers}
          onApply={handleApplyVoucher}
        />

        {/* CTA to store */}
        {activeCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 24 }}
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGoToStore}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 14,
                border: '1px solid rgba(212, 175, 55, 0.3)',
                background: 'rgba(212, 175, 55, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <ShoppingBag size={20} color="#D4AF37" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#D4AF37' }}>
                Перейти в магазин наград
              </span>
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default MyVouchersPage

import { memo, useCallback } from 'react'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { X, ArrowUpRight, ArrowDownLeft, Gift, Percent, Users, Settings, FileText, Calendar, MessageSquare } from 'lucide-react'
import { ProfileTransaction, TransactionCategory } from '../../types'
import { useScrollLock, useSheetRegistration } from '../ui/GestureGuard'
import { useModalRegistration } from '../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION DETAILS SHEET - Bottom sheet with full transaction details
//  Enhanced with GestureGuard integration and drag-to-close
// ═══════════════════════════════════════════════════════════════════════════════

// Unified drag configuration
const DRAG_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 400,
  dragElastic: 0.08,
} as const

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : 20)
    }
  } catch (e) {}
}

interface TransactionDetailsSheetProps {
  transaction: ProfileTransaction | null
  isOpen: boolean
  onClose: () => void
  onViewOrder?: (orderId: number) => void
}

const getCategoryIcon = (category: TransactionCategory) => {
  switch (category) {
    case 'bonus':
      return <Gift size={20} />
    case 'cashback':
      return <Percent size={20} />
    case 'referral':
      return <Users size={20} />
    case 'adjustment':
      return <Settings size={20} />
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

const getCategoryLabel = (category: TransactionCategory): string => {
  switch (category) {
    case 'bonus':
      return 'Бонусы'
    case 'cashback':
      return 'Кэшбэк'
    case 'referral':
      return 'Рефералы'
    case 'adjustment':
      return 'Корректировка'
    default:
      return 'Операция'
  }
}

function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return sign + new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const TransactionDetailsSheet = memo(function TransactionDetailsSheet({
  transaction,
  isOpen,
  onClose,
  onViewOrder,
}: TransactionDetailsSheetProps) {
  const dragControls = useDragControls()

  // GestureGuard integration
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen, 'transaction-details-sheet')

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const shouldClose =
      info.offset.y > DRAG_CONFIG.offsetThreshold ||
      info.velocity.y > DRAG_CONFIG.velocityThreshold

    if (shouldClose) {
      triggerHaptic('light')
      onClose()
    }
  }, [onClose])

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    dragControls.start(e)
  }, [dragControls])

  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  if (!transaction) return null

  const isCredit = transaction.type === 'credit'
  const color = getCategoryColor(transaction.category)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="transaction-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              touchAction: 'none',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="transaction-sheet"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={DRAG_CONFIG.dragElastic}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#0f0f12',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              zIndex: 2001,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
              borderTop: `1px solid ${color}40`,
            }}
          >
            {/* Drag Handle */}
            <div
              onPointerDown={startDrag}
              style={{
                padding: '12px 0',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>

            {/* Header */}
            <div
              onPointerDown={startDrag}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'grab',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
                Детали операции
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="rgba(255, 255, 255, 0.5)" />
              </motion.button>
            </div>

            {/* Content - Scrollable */}
            <div
              data-scroll-container="true"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                padding: 20,
                paddingBottom: 'max(40px, calc(20px + env(safe-area-inset-bottom)))',
              }}
            >
              {/* Main info card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: `${color}10`,
                  border: `1px solid ${color}25`,
                  marginBottom: 20,
                }}
              >
                {/* Icon and category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: color,
                    }}
                  >
                    {isCredit ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>
                      {getCategoryLabel(transaction.category)}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                      {transaction.title}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color: isCredit ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
                    {isCredit ? 'Зачислено на баланс' : 'Списано с баланса'}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <Calendar size={18} color="rgba(255, 255, 255, 0.4)" />
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                      Дата операции
                    </div>
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 2 }}>
                      {formatFullDate(transaction.date)}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span style={{ color: color }}>{getCategoryIcon(transaction.category)}</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                      Категория
                    </div>
                    <div style={{ fontSize: 14, color: color, marginTop: 2 }}>
                      {getCategoryLabel(transaction.category)}
                    </div>
                  </div>
                </div>

                {/* Subtitle */}
                {transaction.subtitle && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <FileText size={18} color="rgba(255, 255, 255, 0.4)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                        Описание
                      </div>
                      <div style={{ fontSize: 14, color: '#fff', marginTop: 2 }}>
                        {transaction.subtitle}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin comment */}
                {transaction.comment && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <MessageSquare size={18} color="rgba(255, 255, 255, 0.4)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                        Комментарий администратора
                      </div>
                      <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, lineHeight: 1.4 }}>
                        {transaction.comment}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order link */}
                {transaction.orderId && onViewOrder && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('medium')
                      onViewOrder(transaction.orderId!)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 14,
                      borderRadius: 12,
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      background: 'rgba(212, 175, 55, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <FileText size={18} color="#D4AF37" />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#D4AF37' }}>
                      Заказ #{transaction.orderId}
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

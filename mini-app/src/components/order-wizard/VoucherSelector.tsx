import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, ChevronDown, X, Check, Clock, AlertCircle } from 'lucide-react'
import { Voucher } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  VOUCHER SELECTOR - Выбор ваучера при оформлении заказа
// ═══════════════════════════════════════════════════════════════════════════════

interface VoucherSelectorProps {
  vouchers: Voucher[]
  selectedVoucherId: string | null
  onSelect: (voucherId: string | null) => void
}

function formatExpiryDays(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days <= 0) return 'Истёк'
  if (days === 1) return 'Истекает сегодня'
  if (days <= 3) return `${days} дня`
  return `${days} дней`
}

export const VoucherSelector = memo(function VoucherSelector({
  vouchers,
  selectedVoucherId,
  onSelect,
}: VoucherSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Фильтруем только активные ваучеры
  const activeVouchers = vouchers.filter(v => v.status === 'active')
  const selectedVoucher = activeVouchers.find(v => v.id === selectedVoucherId)

  const toggleExpand = useCallback(() => {
    try {
      window.Telegram?.WebApp.HapticFeedback.impactOccurred('light')
    } catch {}
    setIsExpanded(prev => !prev)
  }, [])

  const handleSelect = useCallback((voucherId: string) => {
    try {
      window.Telegram?.WebApp.HapticFeedback.impactOccurred('medium')
    } catch {}
    onSelect(voucherId)
    setIsExpanded(false)
  }, [onSelect])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      window.Telegram?.WebApp.HapticFeedback.impactOccurred('light')
    } catch {}
    onSelect(null)
  }, [onSelect])

  // Если нет ваучеров, не показываем компонент
  if (activeVouchers.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{ marginTop: 16 }}
    >
      {/* Заголовок */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}>
        <Ticket size={16} color="#D4AF37" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
          Ваучер
        </span>
        <span style={{
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.5)',
          marginLeft: 'auto',
        }}>
          {activeVouchers.length} доступно
        </span>
      </div>

      {/* Кнопка выбора / Выбранный ваучер */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={toggleExpand}
        style={{
          width: '100%',
          padding: selectedVoucher ? '12px 14px' : '14px 16px',
          borderRadius: 14,
          border: selectedVoucher
            ? '1.5px solid rgba(212, 175, 55, 0.4)'
            : '1.5px solid rgba(255, 255, 255, 0.1)',
          background: selectedVoucher
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)'
            : 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {selectedVoucher ? (
          <>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(212, 175, 55, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Ticket size={18} color="#D4AF37" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedVoucher.title}
              </div>
              <div style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                {selectedVoucher.description}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRemove}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} color="#ef4444" />
            </motion.button>
          </>
        ) : (
          <>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Ticket size={18} color="rgba(255, 255, 255, 0.5)" />
            </div>
            <span style={{
              flex: 1,
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              Выберите ваучер (опционально)
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={18} color="rgba(255, 255, 255, 0.4)" />
            </motion.div>
          </>
        )}
      </motion.button>

      {/* Выпадающий список ваучеров */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              marginTop: 8,
            }}
          >
            <div style={{
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(18, 18, 22, 0.95)',
              overflow: 'hidden',
            }}>
              {activeVouchers.map((voucher, idx) => {
                const isSelected = voucher.id === selectedVoucherId
                const expiresAt = new Date(voucher.expiresAt)
                const now = new Date()
                const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const isExpiringSoon = daysLeft <= 3

                return (
                  <motion.button
                    key={voucher.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(voucher.id)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: isSelected
                        ? 'rgba(212, 175, 55, 0.1)'
                        : 'transparent',
                      borderBottom: idx < activeVouchers.length - 1
                        ? '1px solid rgba(255, 255, 255, 0.06)'
                        : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: 'none',
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isSelected
                        ? 'rgba(212, 175, 55, 0.2)'
                        : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Ticket size={16} color={isSelected ? '#D4AF37' : 'rgba(255, 255, 255, 0.5)'} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {voucher.title}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {isExpiringSoon && (
                          <AlertCircle size={10} color="#F59E0B" />
                        )}
                        <Clock size={10} color={isExpiringSoon ? '#F59E0B' : 'rgba(255, 255, 255, 0.4)'} />
                        <span style={{
                          fontSize: 11,
                          color: isExpiringSoon ? '#F59E0B' : 'rgba(255, 255, 255, 0.5)',
                        }}>
                          {formatExpiryDays(voucher.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'linear-gradient(135deg, #D4AF37, #B48E26)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={12} color="#050505" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Подсказка если выбран ваучер */}
      {selectedVoucher && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(212, 175, 55, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={14} color="#22c55e" />
          <span style={{
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            Ваучер будет применён к заказу
          </span>
        </motion.div>
      )}
    </motion.div>
  )
})

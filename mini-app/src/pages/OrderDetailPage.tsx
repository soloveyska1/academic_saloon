import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, PenTool, Sparkles,
  Clock, Calendar, CreditCard, MessageCircle, XCircle, CheckCircle,
  Loader, Tag, Percent, Gift, Receipt, Copy, Check, Smartphone,
  Building2, Timer, Shield, Zap, Download, ExternalLink, Star, RefreshCw
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail, fetchPaymentInfo, confirmPayment, submitOrderReview, confirmWorkCompletion, requestRevision, PaymentInfo } from '../api/userApi'
import { OrderChat } from '../components/OrderChat'
import { useWebSocketContext } from '../hooks/useWebSocket'

// Work type icons mapping


// Status config
interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  step: number
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_estimation: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_payment: { label: 'Ожидает оплаты', color: '#d4af37', bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, step: 2 },
  verification_pending: { label: 'Проверка оплаты', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)', icon: Loader, step: 2 },
  paid: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  paid_full: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  in_progress: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  review: { label: 'На проверке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 4 },
  revision: { label: 'Правки', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', icon: RefreshCw, step: 3 },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: CheckCircle, step: 5 },
  cancelled: { label: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: 0 },
  rejected: { label: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: 0 },
}

const PROGRESS_STEPS = [
  { num: 1, label: 'Оценка' },
  { num: 2, label: 'Оплата' },
  { num: 3, label: 'Работа' },
  { num: 4, label: 'Проверка' },
  { num: 5, label: 'Готово' },
]

// ═══════════════════════════════════════════════════════════════════════
//                          GOLDEN INVOICE COMPONENT
// ═══════════════════════════════════════════════════════════════════════

interface GoldenInvoiceProps {
  order: Order
  paymentInfo: PaymentInfo | null
  onPaymentConfirmed: () => void
  paymentScheme: 'full' | 'half'
  setPaymentScheme: (scheme: 'full' | 'half') => void
}

function GoldenInvoice({ order, paymentInfo, onPaymentConfirmed, paymentScheme, setPaymentScheme }: GoldenInvoiceProps) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()

  // Определяем, это первая оплата или доплата
  const isSecondPayment = (order.paid_amount || 0) > 0
  const remainingAmount = paymentInfo?.remaining || order.final_price - (order.paid_amount || 0)

  // При доплате - только полная оплата остатка, без выбора схемы
  // const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full') // Lifted up
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card')
  const [copied, setCopied] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // При доплате - всегда полный остаток, при первой оплате - можно выбрать схему
  const amountToPay = isSecondPayment
    ? remainingAmount  // Доплата: всегда полный остаток
    : paymentScheme === 'full'
      ? remainingAmount
      : Math.ceil(remainingAmount / 2)

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    haptic('light')
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''))
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text.replace(/\s/g, '')
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [haptic])

  const handleConfirmPayment = async () => {
    haptic('medium')
    setProcessing(true)
    setError(null)

    try {
      const result = await confirmPayment(order.id, paymentMethod, paymentScheme)

      if (result.success) {
        hapticSuccess()
        setSuccess(true)
        setTimeout(() => {
          onPaymentConfirmed()
        }, 2500)
      } else {
        setError(result.message)
        hapticError()
      }
    } catch (err) {
      console.error('[Payment] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ошибка соединения'
      setError(errorMessage)
      hapticError()
    } finally {
      setProcessing(false)
    }
  }

  // Success Screen
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--bg-card-solid)',
          borderRadius: 24,
          border: '1px solid rgba(212,175,55,0.3)',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          minHeight: 300,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
            border: '2px solid rgba(34,197,94,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CheckCircle size={50} color="#22c55e" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 700,
            color: '#22c55e',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Оплата отправлена!
        </motion.h3>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Мы проверим перевод и начнём работу.<br />
          Обычно это занимает 5-15 минут.
        </motion.p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 24,
        border: '1px solid rgba(212,175,55,0.3)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Gold Accent Top Line */}
      <div style={{
        height: 4,
        background: 'linear-gradient(90deg, #b48e26, #d4af37, #f5d061, #d4af37, #b48e26)',
      }} />

      {/* Invoice Header */}
      <div style={{
        padding: '24px 24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
            border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Receipt size={24} color="#d4af37" />
          </div>
          <div>
            <h3 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0,
              marginBottom: 4,
            }}>
              {isSecondPayment ? 'Доплата' : 'Счёт на оплату'}
            </h3>
            <p style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              margin: 0,
              fontFamily: "var(--font-mono)",
            }}>
              Заказ #{order.id}
            </p>
          </div>
        </div>

        {/* Timer Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: 'rgba(245,158,11,0.1)',
          borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Timer size={14} color="#f59e0b" />
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#f59e0b',
          }}>
            24ч
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: 24 }}>
        {/* Big Price */}
        <div style={{
          textAlign: 'center',
          marginBottom: 28,
        }}>
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: 0,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            К оплате
          </p>
          <motion.p
            key={amountToPay}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              background: 'linear-gradient(135deg, #f5d061, #d4af37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {amountToPay.toLocaleString('ru-RU')} ₽
          </motion.p>

          {/* Show remaining amount when prepayment selected (only for first payment) */}
          {!isSecondPayment && paymentScheme === 'half' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                background: 'rgba(212,175,55,0.1)',
                borderRadius: 10,
                border: '1px solid rgba(212,175,55,0.2)',
                display: 'inline-block',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Доплата после выполнения:{' '}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#d4af37',
                fontFamily: "var(--font-mono)",
              }}>
                {amountToPay.toLocaleString('ru-RU')} ₽
              </span>
            </motion.div>
          )}
        </div>

        {/* Payment Scheme Selector - только для первой оплаты */}
        {!isSecondPayment ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              margin: 0,
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Схема оплаты
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic('light'); setPaymentScheme('full') }}
                style={{
                  padding: 16,
                  background: paymentScheme === 'full'
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                    : 'rgba(255,255,255,0.02)',
                  border: paymentScheme === 'full'
                    ? '2px solid rgba(212,175,55,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  <Zap size={18} color={paymentScheme === 'full' ? '#d4af37' : '#71717a'} />
                  <span style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: paymentScheme === 'full' ? '#d4af37' : '#a1a1aa',
                  }}>
                    100%
                  </span>
                </div>
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}>
                  Полная оплата
                </p>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic('light'); setPaymentScheme('half') }}
                style={{
                  padding: 16,
                  background: paymentScheme === 'half'
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                    : 'rgba(255,255,255,0.02)',
                  border: paymentScheme === 'half'
                    ? '2px solid rgba(212,175,55,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={18} color={paymentScheme === 'half' ? '#d4af37' : '#71717a'} />
                  <span style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: paymentScheme === 'half' ? '#d4af37' : '#a1a1aa',
                  }}>
                    50%
                  </span>
                </div>
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}>
                  Предоплата
                </p>
              </motion.button>
            </div>
          </div>
        ) : (
          /* Для доплаты показываем инфо-блок */
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 20,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
              borderRadius: 14,
              border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#22c55e',
                margin: 0,
                marginBottom: 2,
              }}>
                Предоплата внесена: {order.paid_amount?.toLocaleString('ru-RU')} ₽
              </p>
              <p style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                margin: 0,
              }}>
                Осталось доплатить полную сумму остатка
              </p>
            </div>
          </motion.div>
        )}

        {/* Payment Method Selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            margin: 0,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Способ оплаты
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { haptic('light'); setPaymentMethod('card') }}
              style={{
                padding: 16,
                background: paymentMethod === 'card'
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))'
                  : 'rgba(255,255,255,0.02)',
                border: paymentMethod === 'card'
                  ? '2px solid rgba(59,130,246,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <CreditCard
                size={24}
                color={paymentMethod === 'card' ? '#3b82f6' : '#71717a'}
                style={{ marginBottom: 8 }}
              />
              <p style={{
                fontSize: 14,
                fontWeight: 600,
                color: paymentMethod === 'card' ? '#3b82f6' : '#a1a1aa',
                margin: 0,
              }}>
                На карту
              </p>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { haptic('light'); setPaymentMethod('sbp') }}
              style={{
                padding: 16,
                background: paymentMethod === 'sbp'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))'
                  : 'rgba(255,255,255,0.02)',
                border: paymentMethod === 'sbp'
                  ? '2px solid rgba(139,92,246,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Smartphone
                size={24}
                color={paymentMethod === 'sbp' ? '#8b5cf6' : '#71717a'}
                style={{ marginBottom: 8 }}
              />
              <p style={{
                fontSize: 14,
                fontWeight: 600,
                color: paymentMethod === 'sbp' ? '#8b5cf6' : '#a1a1aa',
                margin: 0,
              }}>
                СБП
              </p>
            </motion.button>
          </div>
        </div>

        {/* Payment Details */}
        <AnimatePresence mode="wait">
          {paymentMethod === 'card' && paymentInfo && (
            <motion.div
              key="card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(59,130,246,0.05)',
                borderRadius: 16,
                border: '1px solid rgba(59,130,246,0.2)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Building2 size={16} color="#3b82f6" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Реквизиты карты
                </span>
              </div>

              {/* Card Number */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => copyToClipboard(paymentInfo.card_number, 'card')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: 'var(--text-main)',
                  letterSpacing: '0.05em',
                }}>
                  {paymentInfo.card_number}
                </span>
                {copied === 'card' ? (
                  <Check size={20} color="#22c55e" />
                ) : (
                  <Copy size={20} color="#71717a" />
                )}
              </motion.button>

              {/* Card Holder */}
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                textAlign: 'center',
              }}>
                {paymentInfo.card_holder}
              </p>
            </motion.div>
          )}

          {paymentMethod === 'sbp' && paymentInfo && (
            <motion.div
              key="sbp"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(139,92,246,0.05)',
                borderRadius: 16,
                border: '1px solid rgba(139,92,246,0.2)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Smartphone size={16} color="#8b5cf6" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Реквизиты СБП
                </span>
              </div>

              {/* Phone Number */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => copyToClipboard(paymentInfo.sbp_phone, 'phone')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: 'var(--text-main)',
                }}>
                  {paymentInfo.sbp_phone}
                </span>
                {copied === 'phone' ? (
                  <Check size={20} color="#22c55e" />
                ) : (
                  <Copy size={20} color="#71717a" />
                )}
              </motion.button>

              {/* Bank */}
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                textAlign: 'center',
              }}>
                Банк: {paymentInfo.sbp_bank}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <p style={{
              fontSize: 13,
              color: '#ef4444',
              margin: 0,
              textAlign: 'center',
            }}>
              {error}
            </p>
          </motion.div>
        )}

        {/* Confirm Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirmPayment}
          disabled={processing}
          style={{
            width: '100%',
            padding: '18px 24px',
            fontSize: 17,
            fontWeight: 700,
            fontFamily: "var(--font-serif)",
            color: processing ? '#71717a' : '#050505',
            background: processing
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(180deg, #f5d061, #d4af37, #b48e26)',
            border: 'none',
            borderRadius: 16,
            cursor: processing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: processing ? 'none' : '0 0 40px -8px rgba(212,175,55,0.6)',
            transition: 'all 0.3s',
          }}
        >
          {processing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Loader size={20} />
              </motion.div>
              Проверяем...
            </>
          ) : (
            <>
              <Check size={20} />
              Я оплатил {amountToPay.toLocaleString('ru-RU')} ₽
            </>
          )}
        </motion.button>

        {/* Note */}
        <p style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          margin: 0,
          marginTop: 16,
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          После нажатия менеджер проверит оплату.<br />
          Обычно это занимает 5-15 минут.
        </p>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//                          REVIEW SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════

interface ReviewSectionProps {
  orderId: number
  haptic: (type: 'light' | 'medium' | 'heavy') => void
  onReviewSubmitted: () => void
}

function ReviewSection({ orderId, haptic, onReviewSubmitted }: ReviewSectionProps) {
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (reviewText.length < 10) {
      setError('Минимум 10 символов')
      return
    }

    haptic('medium')
    setSubmitting(true)
    setError(null)

    try {
      const result = await submitOrderReview(orderId, rating, reviewText)
      if (result.success) {
        haptic('heavy')
        onReviewSubmitted()
      } else {
        setError(result.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
        borderRadius: 20,
        border: '1px solid rgba(212,175,55,0.3)',
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
      }}>
        <Star size={18} color="#d4af37" fill="#d4af37" />
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#d4af37',
        }}>
          Оставьте отзыв
        </span>
      </div>

      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        margin: 0,
        marginBottom: 16,
        lineHeight: 1.5,
      }}>
        Поделитесь впечатлениями — ваш отзыв будет опубликован анонимно
      </p>

      {/* Star Rating */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptic('light'); setRating(star) }}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
            }}
          >
            <Star
              size={32}
              color="#d4af37"
              fill={star <= rating ? '#d4af37' : 'transparent'}
              style={{ transition: 'fill 0.2s' }}
            />
          </motion.button>
        ))}
      </div>

      {/* Review Text */}
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Напишите, что понравилось..."
        style={{
          width: '100%',
          minHeight: 100,
          padding: 14,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-strong)',
          borderRadius: 12,
          color: 'var(--text-main)',
          fontSize: 14,
          resize: 'vertical',
          fontFamily: 'inherit',
          marginBottom: 12,
        }}
      />

      {error && (
        <p style={{
          fontSize: 12,
          color: '#ef4444',
          margin: '0 0 12px 0',
        }}>
          {error}
        </p>
      )}

      {/* Submit Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submitting || reviewText.length < 10}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: submitting || reviewText.length < 10
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg, #d4af37, #b48e26)',
          border: 'none',
          borderRadius: 14,
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: submitting || reviewText.length < 10 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {submitting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Loader size={18} />
            </motion.div>
            Отправляем...
          </>
        ) : (
          <>
            <Star size={18} />
            Отправить отзыв
          </>
        )}
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//                          MAIN ORDER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════

// Status alert configuration
interface StatusAlert {
  title: string
  message: string
  icon: 'check' | 'clock' | 'play' | 'trophy' | 'alert'
  color: string
  action?: string
  price?: number
  bonusUsed?: number
}

const STATUS_ALERTS: Record<string, StatusAlert> = {
  waiting_payment: {
    title: '💰 Цена подтверждена!',
    message: 'Ознакомьтесь с расчётом и оплатите заказ',
    icon: 'check',
    color: '#d4af37',
  },
  confirmed: {
    title: '💰 Цена подтверждена!',
    message: 'Ознакомьтесь с расчётом и оплатите заказ',
    icon: 'check',
    color: '#d4af37',
  },
  paid: {
    title: '🎉 Оплата подтверждена!',
    message: 'Заказ принят в работу. Шериф уже запряг лошадей!',
    icon: 'check',
    color: '#22c55e',
  },
  in_progress: {
    title: '⚡ Заказ в работе!',
    message: 'Автор активно работает над вашим заказом',
    icon: 'play',
    color: '#3b82f6',
  },
  review: {
    title: '✨ Работа готова!',
    message: 'Проверьте результат и подтвердите выполнение',
    icon: 'check',
    color: '#a855f7',
  },
  completed: {
    title: '🏆 Заказ выполнен!',
    message: 'Спасибо за доверие! Будем рады видеть вас снова',
    icon: 'trophy',
    color: '#22c55e',
  },
  verification_pending: {
    title: '⏳ Проверяем оплату',
    message: 'Обычно это занимает 5-15 минут',
    icon: 'clock',
    color: '#8b5cf6',
  },
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError, openBot } = useTelegram()
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPriceAlert, setShowPriceAlert] = useState(false)
  const [statusAlert, setStatusAlert] = useState<StatusAlert | null>(null)

  // Payment Scheme State (Lifted from GoldenInvoice)
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')

  // WebSocket context for real-time updates
  const { addMessageHandler } = useWebSocketContext()

  // Load order function
  const loadOrder = useCallback(async () => {
    if (!id) return
    try {
      const data = await fetchOrderDetail(parseInt(id))
      setOrder(data)

      // Initialize payment scheme from order if available
      if (data.payment_scheme) {
        setPaymentScheme(data.payment_scheme as 'full' | 'half')
      }

      // Check for status change alert - show notification if status changed
      const lastSeenKey = `order_${id}_last_seen_status`
      const lastSeenStatus = sessionStorage.getItem(lastSeenKey)

      // Show status alert for important statuses user hasn't seen
      if (lastSeenStatus !== data.status && STATUS_ALERTS[data.status]) {
        setStatusAlert(STATUS_ALERTS[data.status])
        hapticSuccess()
      }

      // Update last seen status
      sessionStorage.setItem(lastSeenKey, data.status)

      // Load payment info only for statuses where backend allows it
      // Backend allowed: confirmed, waiting_payment, verification_pending, paid
      const paymentAllowedStatuses = ['confirmed', 'waiting_payment', 'verification_pending', 'paid']
      const needsPayment = data.final_price > 0 &&
        (data.paid_amount || 0) < data.final_price &&
        paymentAllowedStatuses.includes(data.status)

      if (needsPayment) {
        try {
          const payment = await fetchPaymentInfo(parseInt(id))
          setPaymentInfo(payment)

          // Show price alert if order has price but user hasn't started payment
          // Only show if we're not already showing a status alert
          const alertKey = `price_alert_shown_${id}`
          if (!sessionStorage.getItem(alertKey) && !STATUS_ALERTS[data.status]) {
            setShowPriceAlert(true)
            hapticSuccess()
            sessionStorage.setItem(alertKey, 'true')
          }
        } catch (err) {
          console.error('Failed to load payment info:', err)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, hapticSuccess])

  // Initial load
  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  // Subscribe to WebSocket updates for this order
  useEffect(() => {
    if (!id) return

    const unsubscribe = addMessageHandler((message) => {
      // Check if this message is about our order
      const msgOrderId = (message as any).order_id
      if (msgOrderId && msgOrderId === parseInt(id)) {
        console.log('[OrderDetail] Received update for this order:', message)

        // Show status alert from WebSocket message
        if (message.type === 'order_update') {
          const newStatus = (message as any).status
          const msgData = (message as any).data || {}

          if (newStatus && STATUS_ALERTS[newStatus]) {
            // Use the title/message from WebSocket if available, else from config
            // Extract price data for price confirmation notifications
            const finalPrice = msgData.final_price || (message as any).final_price
            const bonusUsed = msgData.bonus_used || 0

            setStatusAlert({
              ...STATUS_ALERTS[newStatus],
              title: (message as any).title || STATUS_ALERTS[newStatus].title,
              message: (message as any).message || STATUS_ALERTS[newStatus].message,
              price: finalPrice,
              bonusUsed: bonusUsed,
            })
            hapticSuccess()
            // Update last seen status so we don't show it again on reload
            sessionStorage.setItem(`order_${id}_last_seen_status`, newStatus)
          }
        }

        // Reload order data
        loadOrder()
      }

      // Also refresh on general refresh messages
      if (message.type === 'refresh') {
        const refreshType = (message as any).refresh_type
        if (refreshType === 'all' || refreshType === 'orders') {
          console.log('[OrderDetail] Refresh requested, reloading...')
          loadOrder()
        }
      }
    })

    return unsubscribe
  }, [id, addMessageHandler, loadOrder, hapticSuccess])

  const handleBack = () => {
    haptic('light')
    navigate('/orders')
  }

  const handleChat = () => {
    haptic('medium')
    openBot(`order_chat_${order?.id}`)
  }

  const handlePaymentConfirmed = async () => {
    // Reload order to get updated status
    await loadOrder()
  }

  const getStatusConfig = (status: string): StatusConfig => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }



  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader size={32} color="#d4af37" />
        </motion.div>
      </div>
    )
  }

  // Error state
  if (!order) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 20,
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <XCircle size={40} color="#ef4444" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)' }}>Заказ не найден</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-main)',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-strong)',
            borderRadius: 12,
            cursor: 'pointer',
          }}
        >
          Назад к заказам
        </motion.button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(order.status)
  const StatusIcon = statusConfig.icon
  const isPaid = order.paid_amount >= order.final_price
  const isActive = !['completed', 'cancelled', 'rejected'].includes(order.status)
  const isWaitingPayment = order.status === 'waiting_payment'
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  // Show payment UI if order has price, not paid, and not cancelled/completed
  const showPaymentUI = order.final_price > 0 &&
    (order.paid_amount || 0) < order.final_price &&
    isActive &&
    paymentInfo !== null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      padding: 24,
      paddingBottom: showPaymentUI ? 40 : 180,
    }}>
      {/* Price Ready Alert */}
      <AnimatePresence>
        {showPriceAlert && paymentInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: 16,
              left: 16,
              right: 16,
              zIndex: 1000,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.15) 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 16,
              padding: 16,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CreditCard size={22} color="#0a0a0c" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#d4af37',
                  marginBottom: 4,
                }}>
                  💰 Цена готова!
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(242,242,242,0.8)',
                  lineHeight: 1.4,
                }}>
                  К оплате: <span style={{ color: '#d4af37', fontWeight: 600 }}>
                    {paymentInfo.final_price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowPriceAlert(false)
                    haptic('medium')
                    // Scroll to payment section
                    const paymentSection = document.getElementById('payment-section')
                    paymentSection?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  style={{
                    marginTop: 12,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0a0a0c',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CreditCard size={16} />
                  Перейти к оплате
                </motion.button>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPriceAlert(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <XCircle size={16} color="rgba(255,255,255,0.6)" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Change Alert */}
      <AnimatePresence>
        {statusAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: 16,
              left: 16,
              right: 16,
              zIndex: 1000,
              background: `linear-gradient(135deg, ${statusAlert.color}15 0%, ${statusAlert.color}10 100%)`,
              border: `1px solid ${statusAlert.color}40`,
              borderRadius: 16,
              padding: 16,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${statusAlert.color}20`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring' }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${statusAlert.color} 0%, ${statusAlert.color}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {statusAlert.icon === 'check' && <CheckCircle size={24} color="#0a0a0c" />}
                {statusAlert.icon === 'clock' && <Clock size={24} color="#0a0a0c" />}
                {statusAlert.icon === 'play' && <Sparkles size={24} color="#0a0a0c" />}
                {statusAlert.icon === 'trophy' && <Sparkles size={24} color="#0a0a0c" />}
              </motion.div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: statusAlert.color,
                  marginBottom: 4,
                }}>
                  {statusAlert.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(242,242,242,0.8)',
                  lineHeight: 1.4,
                }}>
                  {statusAlert.message}
                </div>

                {/* Premium Price Display */}
                {statusAlert.price && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    style={{
                      marginTop: 12,
                      padding: '12px 16px',
                      background: `linear-gradient(135deg, ${statusAlert.color}20, ${statusAlert.color}10)`,
                      borderRadius: 12,
                      border: `1px solid ${statusAlert.color}40`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.6)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: 4,
                        }}>
                          К оплате
                        </div>
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            background: `linear-gradient(135deg, ${statusAlert.color}, ${statusAlert.color}cc)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {statusAlert.price.toLocaleString('ru-RU')} ₽
                        </motion.div>
                      </div>
                      {statusAlert.bonusUsed && statusAlert.bonusUsed > 0 && (
                        <div style={{
                          textAlign: 'right',
                        }}>
                          <div style={{
                            fontSize: 10,
                            color: '#f59e0b',
                            marginBottom: 2,
                          }}>
                            Бонусы
                          </div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#f59e0b',
                            fontFamily: "var(--font-mono)",
                          }}>
                            −{statusAlert.bonusUsed.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setStatusAlert(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <XCircle size={16} color="rgba(255,255,255,0.6)" />
              </motion.button>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6, ease: 'linear' }}
              onAnimationComplete={() => setStatusAlert(null)}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 2,
                background: statusAlert.color,
                borderRadius: 1,
                transformOrigin: 'left',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={22} color="#a1a1aa" />
        </motion.button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f5d061, #d4af37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: 4,
          }}>
            {order.work_type_label}
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: 0,
            fontFamily: "var(--font-mono)",
          }}>
            Заказ #{order.id}
          </p>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: statusConfig.bgColor,
          borderRadius: 14,
        }}>
          <StatusIcon size={16} color={statusConfig.color} />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: statusConfig.color,
          }}>
            {statusConfig.label}
          </span>
        </div>
      </motion.header>

      {/* Golden Invoice for orders needing payment */}
      {showPaymentUI && (
        <motion.div
          id="payment-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 24 }}
        >
          <GoldenInvoice
            order={order}
            paymentInfo={paymentInfo}
            onPaymentConfirmed={handlePaymentConfirmed}
            paymentScheme={paymentScheme}
            setPaymentScheme={setPaymentScheme}
          />
        </motion.div>
      )}

      {/* Progress Steps (only for active non-cancelled orders, not during payment) */}
      {!isCancelled && !showPaymentUI && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--bg-card-solid)',
            borderRadius: 20,
            border: '1px solid var(--border-subtle)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          {/* Progress Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            {PROGRESS_STEPS.map((step, i) => {
              const isCompleted = statusConfig.step >= step.num
              const isCurrent = statusConfig.step === step.num

              return (
                <div key={step.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Step Circle */}
                  <motion.div
                    animate={{
                      scale: isCurrent ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      repeat: isCurrent ? Infinity : 0,
                      duration: 2,
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isCompleted
                        ? 'linear-gradient(135deg, #d4af37, #f5d061)'
                        : 'rgba(255,255,255,0.05)',
                      border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 20px rgba(212,175,55,0.4)' : 'none',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle size={16} color="#050505" strokeWidth={2.5} />
                    ) : (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                      }}>
                        {step.num}
                      </span>
                    )}
                  </motion.div>

                  {/* Connector Line */}
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: statusConfig.step > step.num
                        ? 'linear-gradient(90deg, #d4af37, #f5d061)'
                        : 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            {PROGRESS_STEPS.map((step) => {
              const isCompleted = statusConfig.step >= step.num
              const isCurrent = statusConfig.step === step.num

              return (
                <span
                  key={step.num}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isCurrent ? '#d4af37' : isCompleted ? '#a1a1aa' : '#52525b',
                    textAlign: 'center',
                    width: 60,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {step.label}
                </span>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Bento Grid - Regular Order Details (hidden during payment) */}
      {!isWaitingPayment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Topic Card (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: 'var(--bg-card-solid)',
              borderRadius: 20,
              border: '1px solid var(--border-subtle)',
              padding: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}>
              <BookOpen size={16} color="#d4af37" />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#d4af37',
              }}>
                Предмет
              </span>
            </div>
            <p style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-main)',
              margin: 0,
              lineHeight: 1.4,
            }}>
              {order.subject}
            </p>
          </motion.div>

          {/* Two-Column Row: Deadline + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Deadline Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'var(--bg-card-solid)',
                borderRadius: 20,
                border: '1px solid var(--border-subtle)',
                padding: 20,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}>
                <Calendar size={14} color="#d4af37" />
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#d4af37',
                }}>
                  Дедлайн
                </span>
              </div>
              <p style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-main)',
                margin: 0,
              }}>
                {order.deadline || 'Не указан'}
              </p>
            </motion.div>

            {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))',
                borderRadius: 20,
                border: '1px solid rgba(212,175,55,0.2)',
                padding: 20,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}>
                <Receipt size={14} color="#d4af37" />
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#d4af37',
                }}>
                  Итого
                </span>
              </div>
              <p style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#e6c547',
                margin: 0,
                fontFamily: "var(--font-mono)",
              }}>
                {order.final_price.toLocaleString('ru-RU')} ₽
              </p>
            </motion.div>
          </div>

          {/* Files Download Section - Only show when files are available */}
          {/* Work Review Section - When work is delivered */}
          {order.status === 'review' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                borderRadius: 20,
                border: '1px solid rgba(245,158,11,0.3)',
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
                <CheckCircle size={20} color="#f59e0b" />
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f59e0b',
                }}>
                  Работа готова к проверке!
                </span>
              </div>

              {/* Revision info badges */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 16,
              }}>
                {/* 30-day timer */}
                {order.delivered_at && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: 10,
                  }}>
                    <Timer size={14} color="#f59e0b" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {(() => {
                        const deliveredDate = new Date(order.delivered_at)
                        const now = new Date()
                        const daysLeft = 30 - Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24))
                        return daysLeft > 0
                          ? `${daysLeft} дн. на правки`
                          : 'Период истёк'
                      })()}
                    </span>
                  </div>
                )}

                {/* Revision counter */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: (order.revision_count || 0) >= 3
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(34,197,94,0.1)',
                  borderRadius: 10,
                  border: (order.revision_count || 0) >= 3
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid rgba(34,197,94,0.3)',
                }}>
                  <RefreshCw size={14} color={(order.revision_count || 0) >= 3 ? '#ef4444' : '#22c55e'} />
                  <span style={{
                    fontSize: 12,
                    color: (order.revision_count || 0) >= 3 ? '#ef4444' : '#22c55e',
                    fontWeight: 600,
                  }}>
                    {(order.revision_count || 0)}/3 правок
                  </span>
                </div>
              </div>

              {/* Warning if next revision is paid */}
              {(order.revision_count || 0) >= 3 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 12,
                }}>
                  <CreditCard size={16} color="#ef4444" />
                  <span style={{ fontSize: 12, color: '#ef4444' }}>
                    Следующая правка будет платной
                  </span>
                </div>
              )}

              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                Проверьте работу и подтвердите получение или запросите правки.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    try {
                      haptic('medium')
                      const result = await confirmWorkCompletion(order.id)
                      if (result.success) {
                        setOrder(prev => prev ? { ...prev, status: 'completed' } : null)
                        hapticSuccess()
                      }
                    } catch (e) {
                      console.error('Failed to confirm:', e)
                      hapticError()
                    }
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none',
                    borderRadius: 14,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                  }}
                >
                  <CheckCircle size={16} />
                  Всё отлично
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    try {
                      haptic('light')
                      const result = await requestRevision(order.id, '')
                      if (result.success) {
                        setOrder(prev => prev ? { ...prev, status: 'revision' } : null)
                        // Scroll to chat section
                        const chatSection = document.getElementById('order-chat-section')
                        chatSection?.scrollIntoView({ behavior: 'smooth' })
                        hapticSuccess()
                      }
                    } catch (e) {
                      console.error('Failed to request revision:', e)
                      hapticError()
                    }
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    background: 'rgba(245,158,11,0.2)',
                    border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: 14,
                    color: '#f59e0b',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <PenTool size={16} />
                  Нужны правки
                </motion.button>
              </div>
            </motion.div>
          )}

          {order.files_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                borderRadius: 20,
                border: '1px solid rgba(34,197,94,0.3)',
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
              }}>
                <Download size={18} color="#22c55e" />
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#22c55e',
                }}>
                  Готовая работа
                </span>
              </div>
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                Ваша работа готова и доступна для скачивания.
                Файлы хранятся на Яндекс.Диске.
              </p>
              <motion.a
                href={order.files_url}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: 14,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}
              >
                <Download size={18} />
                Скачать файлы
                <ExternalLink size={14} style={{ opacity: 0.7 }} />
              </motion.a>
            </motion.div>
          )}

          {/* Review Section - Only for completed orders without review */}
          {order.status === 'completed' && !order.review_submitted && (
            <ReviewSection orderId={order.id} haptic={haptic} onReviewSubmitted={() => setOrder(prev => prev ? { ...prev, review_submitted: true } : null)} />
          )}

          {/* Review Submitted Badge */}
          {order.status === 'completed' && order.review_submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(34,197,94,0.1)',
                borderRadius: 14,
                border: '1px solid rgba(34,197,94,0.2)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <CheckCircle size={18} color="#22c55e" />
              <span style={{ fontSize: 14, color: '#22c55e' }}>
                Спасибо за отзыв!
              </span>
            </motion.div>
          )}

          {/* Payment Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'var(--bg-card-solid)',
              borderRadius: 20,
              border: '1px solid var(--border-subtle)',
              padding: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <CreditCard size={16} color="#d4af37" />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#d4af37',
              }}>
                Детали оплаты
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Base Price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag size={14} color="#71717a" />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Стоимость</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  fontFamily: "var(--font-mono)",
                }}>
                  {order.price.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Discount */}
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Percent size={14} color="#22c55e" />
                    <span style={{ fontSize: 14, color: '#22c55e' }}>Скидка {order.discount}%</span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#22c55e',
                    fontFamily: "var(--font-mono)",
                  }}>
                    −{Math.round(order.price * order.discount / 100).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              {/* Bonus Used */}
              {order.bonus_used > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Gift size={14} color="#f59e0b" />
                    <span style={{ fontSize: 14, color: '#f59e0b' }}>Бонусы</span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#f59e0b',
                    fontFamily: "var(--font-mono)",
                  }}>
                    −{order.bonus_used.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              {/* Divider */}
              <div style={{
                height: 1,
                background: 'var(--bg-glass)',
                margin: '4px 0',
              }} />

              {/* Payment Scheme Badge - Dynamic based on selection */}
              {(paymentScheme === 'half' || order.payment_scheme === 'half') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'rgba(212,175,55,0.1)',
                  borderRadius: 10,
                  border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <span style={{ fontSize: 13, color: '#d4af37' }}>
                    💳 Схема: <b>Предоплата 50%</b>
                  </span>
                </div>
              )}

              {/* Paid Amount */}
              {order.paid_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="#22c55e" />
                    <span style={{ fontSize: 14, color: '#22c55e' }}>
                      {(paymentScheme === 'half' || order.payment_scheme === 'half') && order.paid_amount < order.final_price
                        ? 'Предоплата внесена'
                        : 'Оплачено'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#22c55e',
                    fontFamily: "var(--font-mono)",
                  }}>
                    {order.paid_amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              {/* Remaining / Surcharge - Dynamic based on selection */}
              {!isPaid && order.final_price > order.paid_amount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#f59e0b" />
                    <span style={{ fontSize: 14, color: '#f59e0b' }}>
                      {paymentScheme === 'half' ? 'Доплата после выполнения' : 'К оплате'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#f59e0b',
                    fontFamily: "var(--font-mono)",
                  }}>
                    {/* Calculate remaining based on scheme if not yet paid */}
                    {(() => {
                      if (order.paid_amount > 0) {
                        return (order.final_price - order.paid_amount).toLocaleString('ru-RU')
                      }
                      // If not paid yet, calculate based on selected scheme
                      if (paymentScheme === 'half') {
                        // Surcharge is the OTHER half (50%)
                        return Math.floor(order.final_price / 2).toLocaleString('ru-RU')
                      }
                      // Full payment
                      return order.final_price.toLocaleString('ru-RU')
                    })()} ₽
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Created Date Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              background: 'var(--bg-card-solid)',
              borderRadius: 20,
              border: '1px solid var(--border-subtle)',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} color="#71717a" />
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Создан</span>
            </div>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: "var(--font-mono)",
            }}>
              {new Date(order.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </motion.div>
        </div>
      )}

      {/* In-App Chat — Premium Feature */}
      {isActive && !showPaymentUI && (
        <div id="order-chat-section">
          <OrderChat orderId={order.id} />
        </div>
      )}

      {/* Fixed Action Bar (not during payment) */}
      {!showPaymentUI && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 100,
            left: 24,
            right: 24,
            display: 'flex',
            gap: 12,
            zIndex: 1000,
          }}
        >
          {/* Chat Button */}
          {isActive && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleChat}
              style={{
                flex: 1,
                padding: '18px 24px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-main)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-strong)',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <MessageCircle size={20} color="#d4af37" />
              Написать менеджеру
            </motion.button>
          )}

          {/* Support Button (for completed/cancelled) */}
          {!isActive && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleChat}
              style={{
                flex: order.status === 'completed' ? 'unset' : 1,
                padding: order.status === 'completed' ? '18px' : '18px 24px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-main)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-strong)',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <MessageCircle size={20} color="#d4af37" />
              {order.status === 'completed' ? '' : 'Поддержка'}
            </motion.button>
          )}

          {/* Quick Reorder Button (for completed orders) - Premium Feature */}
          {order.status === 'completed' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic('medium')
                // Navigate to order form with pre-filled data from this order
                navigate('/create-order', {
                  state: {
                    prefill: {
                      work_type: order.work_type,
                      subject: order.subject,
                      deadline: order.deadline,
                    },
                  },
                })
              }}
              style={{
                flex: 1,
                padding: '18px 24px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--bg-void)',
                background: 'linear-gradient(135deg, #d4af37, #f5d061)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 0 30px -5px rgba(212,175,55,0.5)',
              }}
            >
              <RefreshCw size={20} />
              Заказать снова
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera, Sparkles,
  Clock, Calendar, CreditCard, MessageCircle, XCircle, CheckCircle,
  Loader, Tag, Percent, Gift, Receipt, Copy, Check, Smartphone,
  Building2, Timer, Shield, Zap
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail, fetchPaymentInfo, confirmPayment, PaymentInfo } from '../api/userApi'
import { OrderChat } from '../components/OrderChat'
import { useWebSocketContext } from '../hooks/useWebSocket'

// Work type icons mapping
const WORK_TYPE_ICONS: Record<string, typeof FileText> = {
  masters: GraduationCap,
  diploma: GraduationCap,
  coursework: BookOpen,
  practice: Briefcase,
  essay: PenTool,
  presentation: Presentation,
  control: ClipboardCheck,
  independent: Scroll,
  report: FileText,
  photo_task: Camera,
  other: Sparkles,
}

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
}

function GoldenInvoice({ order, paymentInfo, onPaymentConfirmed }: GoldenInvoiceProps) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card')
  const [copied, setCopied] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountToPay = paymentScheme === 'full'
    ? (paymentInfo?.remaining || order.final_price - order.paid_amount)
    : Math.ceil((paymentInfo?.remaining || order.final_price - order.paid_amount) / 2)

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
          background: '#14141a',
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
            fontFamily: "'Playfair Display', serif",
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
            color: '#a1a1aa',
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
        background: '#14141a',
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
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#f2f2f2',
              margin: 0,
              marginBottom: 4,
            }}>
              Счёт на оплату
            </h3>
            <p style={{
              fontSize: 12,
              color: '#71717a',
              margin: 0,
              fontFamily: "'JetBrains Mono', monospace",
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
            color: '#71717a',
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
              fontFamily: "'JetBrains Mono', monospace",
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
        </div>

        {/* Payment Scheme Selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#71717a',
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
                color: '#71717a',
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
                color: '#71717a',
                margin: 0,
              }}>
                Предоплата
              </p>
            </motion.button>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#71717a',
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
                  background: '#0a0a0c',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#f2f2f2',
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
                color: '#a1a1aa',
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
                  background: '#0a0a0c',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#f2f2f2',
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
                color: '#a1a1aa',
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
            fontFamily: "'Playfair Display', serif",
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
          color: '#52525b',
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
//                          MAIN ORDER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, openBot } = useTelegram()
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // WebSocket context for real-time updates
  const { addMessageHandler } = useWebSocketContext()

  // Load order function
  const loadOrder = useCallback(async () => {
    if (!id) return
    try {
      const data = await fetchOrderDetail(parseInt(id))
      setOrder(data)

      // Load payment info if order has price and is not fully paid
      const needsPayment = data.final_price > 0 &&
        (data.paid_amount || 0) < data.final_price &&
        !['completed', 'cancelled', 'rejected'].includes(data.status)

      if (needsPayment) {
        try {
          const payment = await fetchPaymentInfo(parseInt(id))
          setPaymentInfo(payment)
        } catch (err) {
          console.error('Failed to load payment info:', err)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

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
        console.log('[OrderDetail] Received update for this order, reloading...')
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
  }, [id, addMessageHandler, loadOrder])

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

  const getWorkTypeIcon = (workType: string) => {
    return WORK_TYPE_ICONS[workType] || FileText
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0c',
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
        background: '#0a0a0c',
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
        <p style={{ fontSize: 18, fontWeight: 600, color: '#f2f2f2' }}>Заказ не найден</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: '#f2f2f2',
            background: '#14141a',
            border: '1px solid rgba(255,255,255,0.1)',
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
  const WorkIcon = getWorkTypeIcon(order.work_type)
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
      background: '#0a0a0c',
      padding: 24,
      paddingBottom: showPaymentUI ? 40 : 180,
    }}>
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
            background: '#14141a',
            border: '1px solid rgba(255,255,255,0.08)',
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
            fontFamily: "'Playfair Display', serif",
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
            color: '#71717a',
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 24 }}
        >
          <GoldenInvoice
            order={order}
            paymentInfo={paymentInfo}
            onPaymentConfirmed={handlePaymentConfirmed}
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
            background: '#14141a',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
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
                        color: '#52525b',
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
              background: '#14141a',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)',
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
              color: '#f2f2f2',
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
                background: '#14141a',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.05)',
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
                color: '#f2f2f2',
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
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {order.final_price.toLocaleString('ru-RU')} ₽
              </p>
            </motion.div>
          </div>

          {/* Payment Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: '#14141a',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)',
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
                  <span style={{ fontSize: 14, color: '#a1a1aa' }}>Стоимость</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#f2f2f2',
                  fontFamily: "'JetBrains Mono', monospace",
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
                    fontFamily: "'JetBrains Mono', monospace",
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
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    −{order.bonus_used.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              {/* Divider */}
              <div style={{
                height: 1,
                background: 'rgba(255,255,255,0.08)',
                margin: '4px 0',
              }} />

              {/* Paid Amount */}
              {order.paid_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="#22c55e" />
                    <span style={{ fontSize: 14, color: '#22c55e' }}>Оплачено</span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#22c55e',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {order.paid_amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              {/* Remaining */}
              {!isPaid && order.final_price > order.paid_amount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#ef4444" />
                    <span style={{ fontSize: 14, color: '#ef4444' }}>К оплате</span>
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#ef4444',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {(order.final_price - order.paid_amount).toLocaleString('ru-RU')} ₽
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
              background: '#14141a',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} color="#71717a" />
              <span style={{ fontSize: 14, color: '#71717a' }}>Создан</span>
            </div>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#a1a1aa',
              fontFamily: "'JetBrains Mono', monospace",
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
        <OrderChat orderId={order.id} />
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
                color: '#f2f2f2',
                background: '#14141a',
                border: '1px solid rgba(255,255,255,0.1)',
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
                flex: 1,
                padding: '18px 24px',
                fontSize: 16,
                fontWeight: 600,
                color: '#f2f2f2',
                background: '#14141a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <MessageCircle size={20} color="#d4af37" />
              Поддержка
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  )
}

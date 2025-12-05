import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader, RefreshCw, XCircle, CreditCard,
  Download, ExternalLink, PenTool, CheckCircle, Clock
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail, fetchPaymentInfo, confirmWorkCompletion, requestRevision, PaymentInfo } from '../api/userApi'
import { OrderChat, OrderChatHandle } from '../components/OrderChat'
import { useWebSocketContext } from '../hooks/useWebSocket'

// Extracted Components
import { ReviewSection } from '../components/order/ReviewSection'
import { GoldenInvoice } from '../components/order/GoldenInvoice'
import { OrderHeader } from '../components/order/OrderHeader'
import { OrderProgress } from '../components/order/OrderProgress'
import { StatusAlertNotification, StatusAlert, STATUS_ALERTS } from '../components/order/StatusAlertNotification'

// Status Config (kept for Header usage)
interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: any
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

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError } = useTelegram()

  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusAlert, setStatusAlert] = useState<StatusAlert | null>(null)

  // Payment Scheme State
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')

  // WebSocket
  const { addMessageHandler } = useWebSocketContext()

  // Safe haptics
  const safeHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    try { haptic(type) } catch (e) { console.warn('[Haptic] Failed:', e) }
  }, [haptic])

  const safeHapticSuccess = useCallback(() => {
    try { hapticSuccess() } catch (e) { console.warn('[Haptic] Failed:', e) }
  }, [hapticSuccess])

  // Validate ID
  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  // Load Order
  const loadOrder = useCallback(async () => {
    if (!isValidOrderId) {
      setLoadError('Некорректный ID заказа')
      setLoading(false)
      return
    }
    setLoadError(null)

    try {
      const data = await fetchOrderDetail(orderId)
      setOrder(data)
      if (data.payment_scheme) setPaymentScheme(data.payment_scheme as 'full' | 'half')

      // Status Alert Logic
      const lastSeenKey = `order_${id}_last_seen_status`
      const lastSeenStatus = sessionStorage.getItem(lastSeenKey)

      if (lastSeenStatus !== data.status && STATUS_ALERTS[data.status]) {
        setStatusAlert(STATUS_ALERTS[data.status])
        safeHapticSuccess()
      }
      sessionStorage.setItem(lastSeenKey, data.status)

      // Payment Info Logic
      const paymentAllowedStatuses = ['confirmed', 'waiting_payment', 'verification_pending', 'paid']
      const needsPayment = data.final_price > 0 &&
        (data.paid_amount || 0) < data.final_price &&
        paymentAllowedStatuses.includes(data.status)

      if (needsPayment) {
        try {
          const payment = await fetchPaymentInfo(orderId)
          setPaymentInfo(payment)

          // Price Ready Alert (consolidated into StatusAlert)
          const alertKey = `price_alert_shown_${id}`
          if (!sessionStorage.getItem(alertKey) && !STATUS_ALERTS[data.status]) {
            setStatusAlert({
              title: '💰 Цена готова!',
              message: 'Ознакомьтесь с расчётом и оплатите заказ',
              icon: 'check',
              color: '#d4af37',
              price: payment.final_price
            })
            safeHapticSuccess()
            sessionStorage.setItem(alertKey, 'true')
          }
        } catch (err) {
          console.error('Failed to load payment info:', err)
        }
      }
    } catch (err) {
      console.error('[OrderDetail] Load error:', err)
      setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки заказа')
    } finally {
      setLoading(false)
    }
  }, [id, orderId, isValidOrderId, safeHapticSuccess])

  // Initial Load
  useEffect(() => { loadOrder() }, [loadOrder])

  // WebSocket Subscription
  useEffect(() => {
    if (!isValidOrderId) return
    const unsubscribe = addMessageHandler((message) => {
      const msgOrderId = (message as any).order_id
      if (msgOrderId && msgOrderId === orderId) {
        if (message.type === 'order_update') {
          const newStatus = (message as any).status
          const msgData = (message as any).data || {}
          if (newStatus && STATUS_ALERTS[newStatus]) {
            setStatusAlert({
              ...STATUS_ALERTS[newStatus],
              title: (message as any).title || STATUS_ALERTS[newStatus].title,
              message: (message as any).message || STATUS_ALERTS[newStatus].message,
              price: msgData.final_price || (message as any).final_price,
              bonusUsed: msgData.bonus_used || 0,
            })
            safeHapticSuccess()
            sessionStorage.setItem(`order_${id}_last_seen_status`, newStatus)
          }
        }
        loadOrder()
      }
      if (message.type === 'refresh') {
        const refreshType = (message as any).refresh_type
        if (refreshType === 'all' || refreshType === 'orders') loadOrder()
      }
    })
    return unsubscribe
  }, [id, orderId, isValidOrderId, addMessageHandler, loadOrder, safeHapticSuccess])

  const handleBack = useCallback(() => {
    safeHaptic('light')
    navigate('/orders')
  }, [safeHaptic, navigate])

  const chatRef = useRef<OrderChatHandle>(null)

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader size={32} color="#d4af37" />
        </motion.div>
      </div>
    )
  }

  if (!order || loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <XCircle size={40} color="#ef4444" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
          {loadError || 'Заказ не найден'}<br />
          <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>ID: {id}</span>
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {isValidOrderId && (
            <button onClick={() => { setLoading(true); setTimeout(loadOrder, 100) }} style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600, color: '#d4af37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} /> Повторить
            </button>
          )}
          <button onClick={handleBack} style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-card-solid)', border: '1px solid var(--border-strong)', borderRadius: 12, cursor: 'pointer' }}>
            Назад
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const isActive = !['completed', 'cancelled', 'rejected'].includes(order.status)
  // Payment UI condition
  const showPaymentUI = order.final_price > 0 && (order.paid_amount || 0) < order.final_price && isActive && paymentInfo !== null
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isWaitingPayment = order.status === 'waiting_payment'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: 24, paddingBottom: showPaymentUI ? 40 : 180 }}>
      {/* Status & Price Alerts */}
      <AnimatePresence>
        {statusAlert && (
          <StatusAlertNotification alert={statusAlert} onDismiss={() => setStatusAlert(null)} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <OrderHeader order={order} statusConfig={statusConfig} onBack={handleBack} />

        {!showPaymentUI && !isCancelled && !isWaitingPayment && (
          <OrderProgress activeStep={statusConfig.step} />
        )}

        {/* Payment UI */}
        <AnimatePresence mode="wait">
          {showPaymentUI && paymentInfo ? (
            <GoldenInvoice
              key="invoice"
              order={order}
              paymentInfo={paymentInfo}
              onPaymentConfirmed={loadOrder}
              paymentScheme={paymentScheme}
              setPaymentScheme={setPaymentScheme}
              onChatStart={() => {
                safeHaptic('light')
                document.getElementById('order-chat-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Order Info Cards (Subject, Type, etc. - kept inline for now as they are simple) */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: 'var(--bg-card-solid)', borderRadius: 20, border: '1px solid var(--border-subtle)', padding: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, lineHeight: 1.4 }}>
                  {order.subject}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={16} color="#71717a" />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      Дедлайн: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{new Date(order.deadline || Date.now()).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* File Download */}
              {order.files_url && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))', borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Download size={18} color="#22c55e" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Готовая работа</span>
                  </div>
                  <motion.a href={order.files_url} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.97 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
                    <Download size={18} /> Скачать файлы <ExternalLink size={14} style={{ opacity: 0.7 }} />
                  </motion.a>
                </motion.div>
              )}

              {/* Warning Cards (Revision) - kept inline */}
              {(order.revision_count || 0) >= 3 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }}>
                  <CreditCard size={16} color="#ef4444" />
                  <span style={{ fontSize: 12, color: '#ef4444' }}>Следующая правка будет платной</span>
                </div>
              )}

              {/* Confirmation Actions (for review status) */}
              {order.status === 'review' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { haptic('medium'); await confirmWorkCompletion(order.id); setOrder(prev => prev ? { ...prev, status: 'completed' } : null); hapticSuccess() }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
                    <CheckCircle size={16} /> Всё отлично
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { haptic('light'); await requestRevision(order.id, ''); setOrder(prev => prev ? { ...prev, status: 'revision' } : null); document.getElementById('order-chat-section')?.scrollIntoView({ behavior: 'smooth' }); hapticSuccess() }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 14, color: '#f59e0b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    <PenTool size={16} /> Нужны правки
                  </motion.button>
                </div>
              )}

              {/* Review Section */}
              {order.status === 'completed' && !order.review_submitted && (
                <ReviewSection orderId={order.id} haptic={haptic} onReviewSubmitted={() => setOrder(prev => prev ? { ...prev, review_submitted: true } : null)} />
              )}

              {/* Review Submitted Badge */}
              {order.status === 'completed' && order.review_submitted && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 14, border: '1px solid rgba(34,197,94,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} color="#22c55e" />
                  <span style={{ fontSize: 14, color: '#22c55e' }}>Спасибо за отзыв!</span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Always Visible Chat */}
        <div id="order-chat-section" style={{ marginTop: 24 }}>
          <OrderChat ref={chatRef} orderId={order.id} />
        </div>

        {/* Quick Actions (Reorder) */}
        {!showPaymentUI && order.status === 'completed' && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} style={{ position: 'fixed', bottom: 100, left: 24, right: 24, zIndex: 100 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { haptic('medium'); navigate('/create-order', { state: { prefill: { work_type: order.work_type, subject: order.subject, deadline: order.deadline } } }) }} style={{ width: '100%', padding: '18px 24px', fontSize: 16, fontWeight: 600, color: 'var(--bg-void)', background: 'linear-gradient(135deg, #d4af37, #f5d061)', border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 20px rgba(212,175,55,0.4)' }}>
              <RefreshCw size={20} /> Заказать ещё раз
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

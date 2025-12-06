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
import { PremiumOrderHeader } from '../components/order/PremiumOrderHeader'
import { OrderBentoGrid } from '../components/order/OrderBentoGrid'
import { LiquidProgress } from '../components/order/LiquidProgress'
import { StatusAlertNotification, StatusAlert, STATUS_ALERTS } from '../components/order/StatusAlertNotification'

// Status Config (kept for logic)
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
  confirmed: { label: 'Ожидает оплаты', color: '#d4af37', bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, step: 2 },
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
  const { haptic, hapticSuccess } = useTelegram()

  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusAlert, setStatusAlert] = useState<StatusAlert | null>(null)
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRequestingRevision, setIsRequestingRevision] = useState(false)
  const { addMessageHandler } = useWebSocketContext()
  const chatRef = useRef<OrderChatHandle>(null)

  const safeHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    try { haptic(type) } catch (e) { console.warn('[Haptic] Failed:', e) }
  }, [haptic])

  const safeHapticSuccess = useCallback(() => {
    try { hapticSuccess() } catch (e) { console.warn('[Haptic] Failed:', e) }
  }, [hapticSuccess])

  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

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

      const lastSeenKey = `order_${id}_last_seen_status`
      if (sessionStorage.getItem(lastSeenKey) !== data.status && STATUS_ALERTS[data.status]) {
        setStatusAlert(STATUS_ALERTS[data.status])
        safeHapticSuccess()
      }
      sessionStorage.setItem(lastSeenKey, data.status)

      if (data.final_price > 0 && (data.paid_amount || 0) < data.final_price && ['confirmed', 'waiting_payment', 'paid'].includes(data.status)) {
        try {
          const payment = await fetchPaymentInfo(orderId)
          setPaymentInfo(payment)
        } catch (err) { console.error(err) }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id, orderId, isValidOrderId, safeHapticSuccess])

  useEffect(() => { loadOrder() }, [loadOrder])

  useEffect(() => {
    if (!isValidOrderId) return
    const unsubscribe = addMessageHandler((message) => {
      const msgOrderId = (message as any).order_id
      if (msgOrderId && msgOrderId === orderId) {
        if (message.type === 'order_update') loadOrder()
      }
      if (message.type === 'refresh') loadOrder()
    })
    return unsubscribe
  }, [id, orderId, isValidOrderId, addMessageHandler, loadOrder])

  const handleBack = useCallback(() => {
    safeHaptic('light')
    navigate('/orders')
  }, [safeHaptic, navigate])

  if (loading) {
    return (
      <div className="premium-club-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  if (!order || loadError) {
    return (
      <div className="premium-club-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <XCircle size={40} color="#ef4444" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
          {loadError || 'Заказ не найден'}
        </p>
        <button onClick={handleBack} className="btn-ghost" style={{ padding: '12px 24px', borderRadius: 12 }}>
          Назад
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const showPaymentUI = order.final_price > 0 && (order.paid_amount || 0) < order.final_price && !['completed', 'cancelled', 'rejected'].includes(order.status) && paymentInfo !== null
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isWaitingPayment = order.status === 'waiting_payment' || order.status === 'confirmed'
  const activeStep = statusConfig.step || 1

  return (
    <div className="premium-club-page">
      {/* Background Ambience (handled by CSS .premium-club-page and global noise) */}
      <div className="club-glow" />
      <div className="club-particles">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}
            animate={{ y: [null, Math.random() * -100], opacity: [0, 0.3, 0] }}
            transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, ease: "linear", delay: i }}
            className="particle gold"
            style={{ width: 3, height: 3 }}
          />
        ))}
      </div>

      <div className="club-content">
        <AnimatePresence>
          {statusAlert && (
            <StatusAlertNotification alert={statusAlert} onDismiss={() => setStatusAlert(null)} />
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 10 }}>

          <PremiumOrderHeader order={order} statusConfig={statusConfig} onBack={handleBack} />

          {!showPaymentUI && !isCancelled && !isWaitingPayment && (
            <LiquidProgress activeStep={activeStep} />
          )}

          <OrderBentoGrid order={order} />

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

                {/* Revision Warning */}
                {(order.revision_count || 0) >= 3 && (
                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderColor: 'var(--red-900)' }}>
                    <CreditCard size={16} color="var(--red-400)" />
                    <span style={{ fontSize: 12, color: 'var(--red-400)' }}>Следующая правка будет платной</span>
                  </div>
                )}

                {/* Confirm/Revision Buttons */}
                {order.status === 'review' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={isConfirming || isRequestingRevision}
                      onClick={async () => {
                        if (isConfirming) return
                        setIsConfirming(true)
                        haptic('medium')
                        try {
                          await confirmWorkCompletion(order.id)
                          setOrder(prev => prev ? { ...prev, status: 'completed' } : null)
                          hapticSuccess()
                        } catch (err) { console.error(err) } finally { setIsConfirming(false) }
                      }}
                      className="btn-liquid-gold"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '14px 16px', borderRadius: 14, color: '#000', fontSize: 14, fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      {isConfirming ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {isConfirming ? 'Подтверждаем...' : 'Всё отлично'}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={isConfirming || isRequestingRevision}
                      onClick={async () => {
                        if (isRequestingRevision) return
                        setIsRequestingRevision(true)
                        haptic('light')
                        try {
                          await requestRevision(order.id, '')
                          setOrder(prev => prev ? { ...prev, status: 'revision' } : null)
                          document.getElementById('order-chat-section')?.scrollIntoView({ behavior: 'smooth' })
                        } catch (err) { console.error(err) } finally { setIsRequestingRevision(false) }
                      }}
                      className="btn-ghost"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '14px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600
                      }}
                    >
                      {isRequestingRevision ? <Loader size={16} className="animate-spin" /> : <PenTool size={16} />}
                      {isRequestingRevision ? 'Отправляем...' : 'Нужны правки'}
                    </motion.button>
                  </div>
                )}

                {/* Review Section */}
                {order.status === 'completed' && !order.review_submitted && (
                  <ReviewSection orderId={order.id} haptic={haptic} onReviewSubmitted={() => setOrder(prev => prev ? { ...prev, review_submitted: true } : null)} />
                )}
              </div>
            )}
          </AnimatePresence>

          <div id="order-chat-section" style={{ marginTop: 24 }}>
            <OrderChat ref={chatRef} orderId={order.id} />
          </div>

          {!showPaymentUI && order.status === 'completed' && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} style={{ position: 'fixed', bottom: 100, left: 24, right: 24, zIndex: 100 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/create-order', { state: { prefill: { work_type: order.work_type, subject: order.subject, deadline: order.deadline } } })} className="btn-liquid-gold" style={{ width: '100%', padding: '18px 24px', fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <RefreshCw size={20} /> Заказать ещё раз
              </motion.button>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  )
}

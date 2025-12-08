import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader, XCircle, CheckCircle, PenTool } from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail, fetchPaymentInfo, confirmWorkCompletion, requestRevision, PaymentInfo } from '../api/userApi'
import { useWebSocketContext } from '../hooks/useWebSocket'

// New Premium Components
import { OrderHeroHeader } from '../components/order/OrderHeroHeader'
import { PremiumBentoGrid } from '../components/order/PremiumBentoGrid'
import { OrderTimeline } from '../components/order/OrderTimeline'
import { PremiumFilesSection } from '../components/order/PremiumFilesSection'
import { FloatingActionBar } from '../components/order/FloatingActionBar'
import { PremiumChat, PremiumChatHandle } from '../components/order/PremiumChat'

// Legacy components (still needed)
import { ReviewSection } from '../components/order/ReviewSection'
import { GoldenInvoice } from '../components/order/GoldenInvoice'
import { StatusAlertNotification, StatusAlert, STATUS_ALERTS } from '../components/order/StatusAlertNotification'

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
  const [showTimeline, setShowTimeline] = useState(false)
  const { addMessageHandler } = useWebSocketContext()
  const chatRef = useRef<PremiumChatHandle>(null)

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
        } catch (err) {
          console.error('[OrderDetail] Failed to load payment info:', err)
          // Payment info is optional - continue without it
        }
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

  const openChat = useCallback(() => {
    safeHaptic('light')
    chatRef.current?.open()
  }, [safeHaptic])

  const scrollToPayment = useCallback(() => {
    safeHaptic('light')
    document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' })
  }, [safeHaptic])

  const scrollToReview = useCallback(() => {
    safeHaptic('light')
    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' })
  }, [safeHaptic])

  const handleConfirmCompletion = useCallback(async () => {
    if (isConfirming || !order) return
    setIsConfirming(true)
    safeHaptic('medium')
    try {
      await confirmWorkCompletion(order.id)
      setOrder(prev => prev ? { ...prev, status: 'completed' } : null)
      safeHapticSuccess()
    } catch (err) {
      console.error('[OrderDetail] Failed to confirm completion:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ошибка подтверждения. Попробуйте позже.'
      // Show error to user via Telegram notification
      const tg = window.Telegram?.WebApp
      if (tg?.showAlert) {
        tg.showAlert(errorMessage)
      }
    } finally {
      setIsConfirming(false)
    }
  }, [order, isConfirming, safeHaptic, safeHapticSuccess])

  const handleRequestRevision = useCallback(async () => {
    if (isRequestingRevision || !order) return
    setIsRequestingRevision(true)
    safeHaptic('light')
    try {
      await requestRevision(order.id, '')
      setOrder(prev => prev ? { ...prev, status: 'revision' } : null)
      openChat()
    } catch (err) {
      console.error('[OrderDetail] Failed to request revision:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ошибка запроса правок. Попробуйте позже.'
      // Show error to user via Telegram notification
      const tg = window.Telegram?.WebApp
      if (tg?.showAlert) {
        tg.showAlert(errorMessage)
      }
    } finally {
      setIsRequestingRevision(false)
    }
  }, [order, isRequestingRevision, safeHaptic, openChat])

  const handleReorder = useCallback(() => {
    if (!order) return
    safeHaptic('light')
    navigate('/create-order', {
      state: {
        prefill: {
          work_type: order.work_type,
          subject: order.subject,
          deadline: order.deadline
        }
      }
    })
  }, [order, safeHaptic, navigate])

  const handleStatusAction = useCallback((action: string) => {
    safeHaptic('light')
    switch (action) {
      case 'payment':
        scrollToPayment()
        break
      case 'chat':
        openChat()
        break
      case 'files':
        if (order?.files_url) {
          window.open(order.files_url, '_blank')
        }
        break
      case 'review':
        scrollToReview()
        break
    }
  }, [order, safeHaptic, scrollToPayment, openChat, scrollToReview])

  // Loading state
  if (loading) {
    return (
      <div className="premium-club-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader size={32} className="text-gold" />
        </motion.div>
      </div>
    )
  }

  // Error state
  if (!order || loadError) {
    return (
      <div className="premium-club-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <XCircle size={40} color="#ef4444" />
        </motion.div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
          {loadError || 'Заказ не найден'}
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-main)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Назад к заказам
        </motion.button>
      </div>
    )
  }

  const showPaymentUI = order.final_price > 0
    && (order.paid_amount || 0) < order.final_price
    && !['completed', 'cancelled', 'rejected'].includes(order.status)
    && paymentInfo !== null
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isReview = order.status === 'review'
  const isCompleted = order.status === 'completed'

  return (
    <div className="premium-club-page">
      {/* Background Ambience */}
      <div className="club-glow" />
      <div className="club-particles">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}
            animate={{ y: [null, Math.random() * -100], opacity: [0, 0.2, 0] }}
            transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, ease: "linear", delay: i * 1.5 }}
            className="particle gold"
            style={{ width: 2, height: 2 }}
          />
        ))}
      </div>

      <div className="club-content" style={{ paddingBottom: 160 }}>
        {/* Status Alert Notification */}
        <AnimatePresence>
          {statusAlert && (
            <StatusAlertNotification alert={statusAlert} onDismiss={() => setStatusAlert(null)} />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'relative', zIndex: 10 }}
        >
          {/* 1. Premium Hero Header (includes status, deadline, price, primary action) */}
          <OrderHeroHeader order={order} onBack={handleBack} onActionClick={handleStatusAction} />

          {/* 2. Premium Bento Grid (guarantees, revisions, cashback) */}
          <PremiumBentoGrid order={order} cashbackPercent={5} />

          {/* 4. Payment Section (if needed) */}
          {showPaymentUI && paymentInfo && (
            <div id="payment-section">
              <GoldenInvoice
                order={order}
                paymentInfo={paymentInfo}
                onPaymentConfirmed={loadOrder}
                paymentScheme={paymentScheme}
                setPaymentScheme={setPaymentScheme}
                onChatStart={openChat}
              />
            </div>
          )}

          {/* 5. Files Section */}
          <PremiumFilesSection
            order={order}
            onDownload={() => safeHaptic('medium')}
          />

          {/* 6. Review Actions (for review status) */}
          {isReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: 20,
                borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(20, 20, 23, 0.95) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                marginBottom: 24,
              }}
            >
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: 8,
              }}>
                Проверьте работу
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                Скачайте файлы, проверьте качество и выберите действие ниже.
              </div>

              {/* Revision warning */}
              {(order as any).revision_count >= 3 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  marginBottom: 16,
                }}>
                  <PenTool size={16} color="#f59e0b" />
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>
                    Следующая правка будет платной
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isConfirming}
                  onClick={handleConfirmCompletion}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: isConfirming ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 10px 30px -5px rgba(34, 197, 94, 0.4)',
                    opacity: isConfirming ? 0.6 : 1,
                  }}
                >
                  {isConfirming ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader size={16} />
                    </motion.div>
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {isConfirming ? 'Подтверждаем...' : 'Всё отлично'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isRequestingRevision}
                  onClick={handleRequestRevision}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 16,
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isRequestingRevision ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: isRequestingRevision ? 0.6 : 1,
                  }}
                >
                  {isRequestingRevision ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader size={16} />
                    </motion.div>
                  ) : (
                    <PenTool size={16} />
                  )}
                  {isRequestingRevision ? 'Отправляем...' : 'Нужны правки'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 7. Review Section (for completed orders) */}
          {isCompleted && !order.review_submitted && (
            <div id="review-section">
              <ReviewSection
                orderId={order.id}
                haptic={haptic}
                onReviewSubmitted={() => setOrder(prev => prev ? { ...prev, review_submitted: true } : null)}
              />
            </div>
          )}

          {/* 8. Order Timeline (collapsible) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                safeHaptic('light')
                setShowTimeline(!showTimeline)
              }}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: showTimeline ? 16 : 24,
              }}
            >
              <span>История заказа</span>
              <motion.span
                animate={{ rotate: showTimeline ? 180 : 0 }}
                style={{ fontSize: 18 }}
              >
                ↓
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {showTimeline && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <OrderTimeline order={order} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 9. Chat Section */}
          <PremiumChat ref={chatRef} orderId={order.id} />
        </motion.div>
      </div>

      {/* 10. Floating Action Bar */}
      <FloatingActionBar
        order={order}
        unreadMessages={0}
        onChatClick={openChat}
        onFilesClick={() => order.files_url && window.open(order.files_url, '_blank')}
        onReviewClick={scrollToReview}
        onConfirmClick={handleConfirmCompletion}
        onRevisionClick={handleRequestRevision}
        onPaymentClick={scrollToPayment}
        onReorderClick={handleReorder}
      />
    </div>
  )
}

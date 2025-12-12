import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Timer, CheckCircle, Zap, Shield, CreditCard,
  Smartphone, Building2, Copy, Check, Loader, ChevronLeft,
  FileText, AlertCircle
} from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'
import {
  BatchPaymentInfo,
  fetchBatchPaymentInfo,
  confirmBatchPayment
} from '../api/userApi'

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH PAYMENT PAGE — Pay All Orders at Once
// ═══════════════════════════════════════════════════════════════════════════

export function BatchPaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { haptic, hapticSuccess, hapticError } = useTelegram()

  // Get order IDs from URL params
  const orderIdsParam = searchParams.get('orders')
  const orderIds = orderIdsParam ? orderIdsParam.split(',').map(Number).filter(n => !isNaN(n)) : []

  const [paymentInfo, setPaymentInfo] = useState<BatchPaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card')
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [copied, setCopied] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load payment info
  useEffect(() => {
    async function loadPaymentInfo() {
      if (orderIds.length === 0) {
        setError('Не выбраны заказы для оплаты')
        setLoading(false)
        return
      }

      try {
        const info = await fetchBatchPaymentInfo(orderIds)
        setPaymentInfo(info)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    loadPaymentInfo()
  }, [])

  const amountToPay = paymentInfo
    ? paymentScheme === 'full'
      ? paymentInfo.total_amount
      : Math.ceil(paymentInfo.total_amount / 2)
    : 0

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    haptic('light')
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''))
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
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
    if (!paymentInfo) return

    haptic('medium')
    setProcessing(true)
    setSubmitError(null)

    try {
      const result = await confirmBatchPayment(
        paymentInfo.orders.map(o => o.id),
        paymentMethod,
        paymentScheme
      )

      if (result.success) {
        hapticSuccess()
        setSuccess(true)
        setTimeout(() => {
          navigate('/orders')
        }, 2500)
      } else {
        setSubmitError(result.message)
        hapticError()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка соединения'
      setSubmitError(errorMessage)
      hapticError()
    } finally {
      setProcessing(false)
    }
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
          <Loader size={32} color="var(--gold-400)" />
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <AlertCircle size={48} color="#ef4444" />
        <p style={{ fontSize: 16, color: 'var(--text-main)', textAlign: 'center' }}>
          {error}
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/orders')}
          style={{
            padding: '12px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 12,
            color: 'var(--text-main)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Вернуться к заказам
        </motion.button>
      </div>
    )
  }

  // Success Screen
  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
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
            maxWidth: 400,
            width: '100%',
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
              fontFamily: 'var(--font-serif)',
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
            Мы проверим перевод и начнём работу по всем заказам.<br />
            Обычно это занимает 5-15 минут.
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      paddingBottom: 40,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            haptic('light')
            navigate('/orders')
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} color="var(--text-main)" />
        </motion.button>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-main)',
            margin: 0,
          }}>
            Оплата заказов
          </h1>
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: 0,
          }}>
            {paymentInfo?.orders_count} {paymentInfo?.orders_count === 1 ? 'заказ' : paymentInfo?.orders_count && paymentInfo.orders_count < 5 ? 'заказа' : 'заказов'}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Invoice Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg-card-solid)',
            borderRadius: 24,
            border: '1px solid rgba(212,175,55,0.3)',
            overflow: 'hidden',
          }}
        >
          {/* Gold Accent */}
          <div style={{
            height: 4,
            background: 'linear-gradient(90deg, #b48e26, #d4af37, #f5d061, #d4af37, #b48e26)',
          }} />

          {/* Header */}
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
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  marginBottom: 4,
                }}>
                  Общий счёт
                </h3>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}>
                  {paymentInfo?.orders_count} заказов
                </p>
              </div>
            </div>

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
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
                24ч
              </span>
            </div>
          </div>

          {/* Orders List */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              margin: 0,
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Заказы к оплате
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paymentInfo?.orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(212,175,55,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <FileText size={18} color="var(--gold-400)" />
                    </div>
                    <div>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        margin: 0,
                        marginBottom: 2,
                      }}>
                        {order.work_type_label}
                      </p>
                      <p style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        #{order.id}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--gold-300)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {order.remaining.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ padding: 24 }}>
            {/* Big Price */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <p style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                margin: 0,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Итого к оплате
              </p>
              <motion.p
                key={amountToPay}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
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

              {paymentScheme === 'half' && (
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
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {amountToPay.toLocaleString('ru-RU')} ₽
                  </span>
                </motion.div>
              )}
            </div>

            {/* Payment Scheme Selector */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
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
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
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
                color: 'var(--text-muted)',
                margin: 0,
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Способ оплаты
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#3b82f6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Реквизиты карты
                    </span>
                  </div>

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
                      fontFamily: 'var(--font-mono)',
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
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#8b5cf6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Реквизиты СБП
                    </span>
                  </div>

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
                      fontFamily: 'var(--font-mono)',
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
            {submitError && (
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
                  {submitError}
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
                fontFamily: 'var(--font-serif)',
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

            <p style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              margin: 0,
              marginTop: 16,
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              После нажатия менеджер проверит оплату.<br />
              Все {paymentInfo?.orders_count} заказов будут подтверждены одновременно.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

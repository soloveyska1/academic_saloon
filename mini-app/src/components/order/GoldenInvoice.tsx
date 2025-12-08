import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Receipt, Timer, CheckCircle, Zap, Shield, CreditCard,
    Smartphone, Building2, Copy, Check, Loader, Headphones
} from 'lucide-react'
import { Order } from '../../types'
import { PaymentInfo, confirmPayment } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'

interface GoldenInvoiceProps {
    order: Order
    paymentInfo: PaymentInfo | null
    onPaymentConfirmed: () => void
    paymentScheme: 'full' | 'half'
    setPaymentScheme: (scheme: 'full' | 'half') => void
    onChatStart?: () => void
}

export function GoldenInvoice({ order, paymentInfo, onPaymentConfirmed, paymentScheme, setPaymentScheme, onChatStart }: GoldenInvoiceProps) {
    const { haptic, hapticSuccess, hapticError } = useTelegram()

    // Определяем, это первая оплата или доплата
    const isSecondPayment = (order.paid_amount || 0) > 0
    const remainingAmount = paymentInfo?.remaining || order.final_price - (order.paid_amount || 0)

    // При доплате - только полная оплата остатка, без выбора схемы
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
                {/* Price Breakdown - показываем если есть промокод или скидки */}
                {(order.promo_code || (order.discount || 0) > 0 || (order.bonus_used || 0) > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginBottom: 20,
                            padding: '16px',
                            background: 'rgba(139,92,246,0.05)',
                            borderRadius: 16,
                            border: '1px solid rgba(139,92,246,0.2)',
                        }}
                    >
                        <p style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            margin: 0,
                            marginBottom: 12,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            💰 Расчёт стоимости
                        </p>

                        {/* Original price */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                Базовая цена:
                            </span>
                            <span style={{
                                fontSize: 13,
                                color: 'var(--text-secondary)',
                                textDecoration: 'line-through',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {order.price?.toLocaleString('ru-RU')} ₽
                            </span>
                        </div>

                        {/* Promo code discount */}
                        {order.promo_code && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                                padding: '8px 12px',
                                background: 'rgba(139,92,246,0.1)',
                                borderRadius: 10,
                            }}>
                                <span style={{
                                    fontSize: 13,
                                    color: '#a78bfa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}>
                                    🎟️ <span style={{ fontWeight: 600 }}>{order.promo_code}</span>
                                </span>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#22c55e',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    −{order.promo_discount || 0}%
                                </span>
                            </div>
                        )}

                        {/* Loyalty discount */}
                        {(order.discount || 0) > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}>
                                <span style={{ fontSize: 13, color: '#60a5fa' }}>
                                    🎖️ Скидка лояльности:
                                </span>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#22c55e',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    −{order.discount}%
                                </span>
                            </div>
                        )}

                        {/* Bonuses */}
                        {(order.bonus_used || 0) > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}>
                                <span style={{ fontSize: 13, color: '#fbbf24' }}>
                                    ⭐ Бонусы:
                                </span>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#22c55e',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    −{order.bonus_used?.toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                        )}

                        {/* Savings summary */}
                        {order.promo_code && (
                            <div style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: '1px solid rgba(139,92,246,0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                                    💚 Ваша экономия:
                                </span>
                                <span style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: '#22c55e',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    {Math.round(order.price - order.final_price).toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}

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

                {/* Chat with Manager Button */}
                {onChatStart && (
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { haptic('light'); onChatStart() }}
                        style={{
                            width: '100%',
                            marginBottom: 16,
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Headphones size={16} color="var(--text-secondary)" />
                        <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                        }}>
                            Нужна помощь? Написать менеджеру
                        </span>
                    </motion.button>
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

import { motion } from 'framer-motion'
import { CheckCircle, Clock, Sparkles, XCircle } from 'lucide-react'

export interface StatusAlert {
    title: string
    message: string
    icon: 'check' | 'clock' | 'play' | 'trophy' | 'alert'
    color: string
    action?: string
    price?: number
    bonusUsed?: number
}

interface StatusAlertNotificationProps {
    alert: StatusAlert
    onDismiss: () => void
}

export const STATUS_ALERTS: Record<string, StatusAlert> = {
    waiting_payment: {
        title: 'Расчёт готов',
        message: 'Проверьте сумму и переходите к оплате',
        icon: 'check',
        color: '#d4af37',
    },
    paid: {
        title: 'Оплата подтверждена',
        message: 'Заказ принят в работу. Дальше обновления придут автоматически.',
        icon: 'check',
        color: '#22c55e',
    },
    in_progress: {
        title: 'Заказ в работе',
        message: 'Автор активно работает над вашим заказом',
        icon: 'play',
        color: '#3b82f6',
    },
    review: {
        title: 'Работа готова',
        message: 'Проверьте результат и подтвердите выполнение',
        icon: 'check',
        color: '#a855f7',
    },
    completed: {
        title: 'Заказ выполнен',
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

export function StatusAlertNotification({ alert, onDismiss }: StatusAlertNotificationProps) {
    return (
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
                background: `linear-gradient(135deg, ${alert.color}15 0%, ${alert.color}10 100%)`,
                border: `1px solid ${alert.color}40`,
                borderRadius: 12,
                padding: 16,
                backdropFilter: 'blur(16px)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${alert.color}20`,
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
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${alert.color} 0%, ${alert.color}cc 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    {alert.icon === 'check' && <CheckCircle size={24} color="var(--text-on-gold)" />}
                    {alert.icon === 'clock' && <Clock size={24} color="var(--text-on-gold)" />}
                    {alert.icon === 'play' && <Sparkles size={24} color="var(--text-on-gold)" />}
                    {alert.icon === 'trophy' && <Sparkles size={24} color="var(--text-on-gold)" />}
                </motion.div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: alert.color,
                        marginBottom: 4,
                    }}>
                        {alert.title}
                    </div>
                    <div style={{
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                    }}>
                        {alert.message}
                    </div>

                    {/* Premium Price Display */}
                    {alert.price && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            style={{
                                marginTop: 12,
                                padding: '12px 16px',
                                background: `linear-gradient(135deg, ${alert.color}20, ${alert.color}10)`,
                                borderRadius: 12,
                                border: `1px solid ${alert.color}40`,
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
                                        color: 'var(--text-secondary)',
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
                                            background: `linear-gradient(135deg, ${alert.color}, ${alert.color}cc)`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}
                                    >
                                        {alert.price.toLocaleString('ru-RU')} ₽
                                    </motion.div>
                                </div>
                                {alert.bonusUsed && alert.bonusUsed > 0 && (
                                    <div style={{
                                        textAlign: 'right',
                                    }}>
                                        <div style={{
                                            fontSize: 10,
                                            color: 'var(--warning-text)',
                                            marginBottom: 2,
                                        }}>
                                            Бонусы
                                        </div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'var(--warning-text)',
                                            fontFamily: "var(--font-mono)",
                                        }}>
                                            −{alert.bonusUsed.toLocaleString('ru-RU')} ₽
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onDismiss}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'var(--surface-active)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <XCircle size={16} color="var(--text-secondary)" />
                </motion.button>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 6, ease: 'linear' }}
                onAnimationComplete={onDismiss}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 16,
                    right: 16,
                    height: 2,
                    background: alert.color,
                    borderRadius: 1,
                    transformOrigin: 'left',
                }}
            />
        </motion.div>
    )
}

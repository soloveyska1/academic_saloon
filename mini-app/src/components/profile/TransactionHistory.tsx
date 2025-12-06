import { motion } from 'framer-motion'
import { ShoppingBag, Gift } from 'lucide-react'
import { Transaction } from '../../types'
import { glassStyle } from '../ui/PremiumDesign'

interface Props {
    transactions: Transaction[]
}

export function TransactionHistory({ transactions }: Props) {
    const reasonLabels: Record<string, string> = {
        order_created: 'Бонус за заказ',
        referral_bonus: 'Реферал',
        admin_adjustment: 'Корректировка',
        order_discount: 'Списание на заказ',
        compensation: 'Компенсация',
        order_cashback: 'Кешбэк',
        bonus_expired: 'Сгорание бонусов',
        daily_luck: 'Ежедневный бонус',
        coupon: 'Купон',
        order_refund: 'Возврат бонусов'
    }

    const history = [...transactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

    if (history.length === 0) {
        return (
            <div style={{ ...glassStyle, padding: 24, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    История операций пуста
                </p>
            </div>
        )
    }

    return (
        <div style={{ ...glassStyle, padding: '20px' }}>
            <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 16,
                color: 'var(--text-main)',
                fontFamily: 'var(--font-serif)'
            }}>
                История операций
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map((tx, i) => (
                    <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: 12,
                            borderBottom: i === history.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: tx.type === 'debit'
                                    ? 'rgba(245, 158, 11, 0.1)' // Amber/Orange for списание
                                    : 'rgba(212, 175, 55, 0.1)', // Gold for начисление
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: tx.type === 'debit' ? '#fbbf24' : '#d4af37'
                            }}>
                                {tx.type === 'debit' ? <ShoppingBag size={18} /> : <Gift size={18} />}
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                    {tx.description || reasonLabels[tx.reason] || 'Операция'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} • {reasonLabels[tx.reason] || tx.reason}
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: tx.type === 'debit' ? '#fbbf24' : '#d4af37' // Amber for списание, Gold for начисление
                            }}>
                                {tx.type === 'debit' ? '-' : '+'}{Math.round(tx.amount).toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

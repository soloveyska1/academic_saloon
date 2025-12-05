import { motion } from 'framer-motion'
import { ShoppingBag, Gift } from 'lucide-react'
import { Order } from '../../types'
import { glassStyle } from '../ui/PremiumDesign'

interface Props {
    orders: Order[]
}

export function TransactionHistory({ orders }: Props) {
    // Derive transactions from orders
    // We simulate "transactions" by treating each order as an expense
    // and each bonus usage as a separate entry if applicable, or combined.

    const transactions = orders.flatMap(order => {
        const items = []

        // Payment (Real Money)
        if (order.paid_amount > 0) {
            items.push({
                id: `pay_${order.id}`,
                type: 'expense',
                amount: order.paid_amount,
                currency: 'RUB',
                title: `Оплата заказа #${order.id}`,
                subtitle: order.work_type_label,
                date: order.created_at, // Ideally payment date, but created_at is proxy
                icon: ShoppingBag
            })
        }

        // Bonus Usage
        if (order.bonus_used > 0) {
            items.push({
                id: `bonus_${order.id}`,
                type: 'bonus_expense',
                amount: order.bonus_used,
                currency: 'BONUS',
                title: `Списание бонусов`,
                subtitle: `Заказ #${order.id}`,
                date: order.created_at,
                icon: Gift
            })
        }

        return items
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Limit to recent 10 to clear clutter
    const recentTransactions = transactions.slice(0, 10)

    if (recentTransactions.length === 0) {
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
                {recentTransactions.map((tx, i) => (
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
                            borderBottom: i === recentTransactions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: tx.type === 'expense'
                                    ? 'rgba(245, 158, 11, 0.1)' // Amber/Orange for expense (Joyful, not Red)
                                    : 'rgba(212, 175, 55, 0.1)', // Gold for bonus
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: tx.type === 'expense' ? '#fbbf24' : '#d4af37'
                            }}>
                                <tx.icon size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                    {tx.title}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} • {tx.subtitle}
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: tx.type === 'expense' ? '#fbbf24' : '#d4af37' // Amber for expense, Gold for bonus
                            }}>
                                -{Math.round(tx.amount).toLocaleString()} {tx.currency === 'rub' ? '₽' : (tx.currency === 'BONUS' ? 'B' : '₽')}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

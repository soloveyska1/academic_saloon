import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { Order } from '../../types'

interface OrderInfoCardProps {
    order: Order
}

export function OrderInfoCard({ order }: OrderInfoCardProps) {

    const formatDeadline = (deadline: string | null) => {
        if (!deadline) return "Не указан"

        // Handle special keywords if they slip through
        if (deadline.toLowerCase() === 'today') return 'Сегодня'
        if (deadline.toLowerCase() === 'tomorrow') return 'Завтра'

        // Try parsing
        const date = new Date(deadline)

        // Check if valid
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        }

        // Return raw string if it's not a parseable date (e.g. "To be discussed")
        return deadline
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
                background: 'var(--bg-card-solid)',
                borderRadius: 20,
                border: '1px solid var(--border-subtle)',
                padding: 20
            }}
        >
            <h2 style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: 12,
                lineHeight: 1.4
            }}>
                {order.subject}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={16} color="#71717a" />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        Дедлайн: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                            {formatDeadline(order.deadline)}
                        </span>
                    </span>
                </div>
            </div>
        </motion.div>
    )
}

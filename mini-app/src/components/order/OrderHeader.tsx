import { motion } from 'framer-motion'
import { ArrowLeft, Clock } from 'lucide-react'
import { Order } from '../../types'

interface StatusConfig {
    label: string
    color: string
    bgColor: string
    icon: any
    step: number
}

interface OrderHeaderProps {
    order: Order
    statusConfig: StatusConfig
    onBack: () => void
}

export function OrderHeader({ order, statusConfig, onBack }: OrderHeaderProps) {
    const StatusIcon = statusConfig.icon

    return (
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
                onClick={onBack}
                style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-default)',
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
                    fontFamily: "var(--font-serif)",
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
                    color: 'var(--text-muted)',
                    margin: 0,
                    fontFamily: "var(--font-mono)",
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
    )
}

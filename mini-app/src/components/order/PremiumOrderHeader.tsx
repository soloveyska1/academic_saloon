import { motion } from 'framer-motion'
import { ArrowLeft, Clock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Order } from '../../types'

interface StatusConfig {
    label: string
    color: string
    bgColor: string
    icon: any
    step: number
}

interface PremiumOrderHeaderProps {
    order: Order
    statusConfig: StatusConfig
    onBack: () => void
}

export function PremiumOrderHeader({ order, statusConfig, onBack }: PremiumOrderHeaderProps) {
    const StatusIcon = statusConfig.icon

    return (
        <div className="club-header" style={{ marginBottom: 32 }}>

            {/* Top Row */}
            <div className="club-header-top" style={{ marginBottom: 24 }}>
                <button
                    onClick={onBack}
                    className="btn-ghost"
                    style={{
                        width: 44, height: 44,
                        borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="vip-quick-badge">
                    <span style={{ opacity: 0.7 }}>ID</span>
                    <span>#{order.id.toString().padStart(4, '0')}</span>
                </div>
            </div>

            {/* Main Title Area */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h1 className="club-title" style={{ fontSize: 28, marginBottom: 8 }}>
                        {order.work_type_label}
                    </h1>
                </motion.div>

                {/* Dynamic Status Badge (Custom Glass Pill) */}
                <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{ display: 'flex', justifyContent: 'center' }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: statusConfig.bgColor,
                        border: `1px solid ${statusConfig.color}40`,
                        borderRadius: 20,
                        backdropFilter: 'blur(8px)',
                    }}>
                        <StatusIcon size={16} color={statusConfig.color} />
                        <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: statusConfig.color,
                            letterSpacing: '0.02em'
                        }}>
                            {statusConfig.label}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

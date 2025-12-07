import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
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
        <div style={{ marginBottom: 40, padding: '0 8px' }}>

            {/* Top Row: Back Button & ID */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24
            }}>
                <button
                    onClick={onBack}
                    style={{
                        width: 44, height: 44,
                        borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                    }}
                >
                    <ArrowLeft size={20} />
                </button>

                <div style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em' }}>ID</span>
                    <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{order.id.toString().padStart(4, '0')}
                    </span>
                </div>
            </div>

            {/* Main Title Area */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h1 style={{
                        fontSize: 32,
                        marginBottom: 16,
                        fontFamily: 'var(--font-serif)',
                        background: 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1
                    }}>
                        {order.work_type_label}
                    </h1>
                </motion.div>

                {/* Dynamic Status Badge (Jewel Style) */}
                <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 18px',
                        background: `linear-gradient(90deg, ${statusConfig.bgColor} 0%, rgba(0,0,0,0) 100%)`,
                        borderLeft: `2px solid ${statusConfig.color}`,
                        borderRadius: '0 12px 12px 0',
                    }}>
                        <div style={{
                            padding: 6,
                            borderRadius: '50%',
                            background: `${statusConfig.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <StatusIcon size={14} color={statusConfig.color} />
                        </div>
                        <span style={{
                            fontSize: 14,
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

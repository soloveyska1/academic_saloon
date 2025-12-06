import { motion } from 'framer-motion'
import { Clock, Download, Coins, ExternalLink, Calendar, FileText } from 'lucide-react'
import { Order } from '../../types'

interface BentoGridProps {
    order: Order
}

export function OrderBentoGrid({ order }: BentoGridProps) {

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Не указан'
        if (dateStr.toLowerCase() === 'today') return 'Сегодня'
        if (dateStr.toLowerCase() === 'tomorrow') return 'Завтра'
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }

    const isPaid = (order.paid_amount || 0) >= order.final_price && order.final_price > 0
    const hasFiles = !!order.files_url

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 32,
        }}>
            {/* 1. Deadline Card -> VIP Status Card Style */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card"
                style={{
                    gridColumn: 'span 1',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 120,
                    borderRadius: 20,
                }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--pc-elevated)', border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Calendar size={16} className="text-muted" />
                </div>
                <div>
                    <div className="vip-progress-labels" style={{ marginTop: 12, marginBottom: 4 }}>Дедлайн</div>
                    <div className="multiplier-value" style={{ fontSize: 16 }}>
                        {formatDate(order.deadline)}
                    </div>
                </div>
            </motion.div>

            {/* 2. Price Card -> Gold Gradient Style */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card-gold"
                style={{
                    gridColumn: 'span 1',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 120,
                    borderRadius: 20,
                }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(212,175,55,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Coins size={16} color="#d4af37" />
                </div>
                <div>
                    <div className="vip-progress-labels" style={{ marginTop: 12, marginBottom: 4, color: '#d4af37' }}>Бюджет</div>
                    {order.final_price > 0 ? (
                        <>
                            <div className="jackpot-digits" style={{ fontSize: 18 }}>
                                {order.final_price.toLocaleString()} ₽
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            На оценке
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 3. Files Card -> Elevated Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card-elevated"
                style={{
                    gridColumn: 'span 2',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: hasFiles ? 'pointer' : 'default',
                    borderRadius: 20,
                }}
                onClick={() => {
                    if (hasFiles) window.open(order.files_url, '_blank')
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40,
                        borderRadius: 14,
                        background: hasFiles ? 'rgba(34,197,94,0.1)' : 'var(--pc-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {hasFiles ? <Download size={20} color="#22c55e" /> : <FileText size={20} className="text-muted" />}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>
                            {hasFiles ? 'Готовая работа' : 'Файлы заказа'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {hasFiles ? 'Нажмите, чтобы скачать' : 'Файлы еще не загружены'}
                        </div>
                    </div>
                </div>
                {hasFiles && <ExternalLink size={16} className="text-muted" />}
            </motion.div>

            {/* 4. Subject Card -> Simple Glass */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card"
                style={{
                    gridColumn: 'span 2',
                    padding: 20,
                    borderRadius: 20,
                }}
            >
                <div className="vip-progress-labels" style={{ marginBottom: 8 }}>Тема</div>
                <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5, fontWeight: 500 }}>
                    {order.subject}
                </div>
            </motion.div>

        </div>
    )
}

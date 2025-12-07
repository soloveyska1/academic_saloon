import { motion } from 'framer-motion'
import { Download, Coins, Calendar, FileText, ArrowUpRight } from 'lucide-react'
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

    const hasFiles = !!order.files_url

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16, // Increased gap
            marginBottom: 32,
        }}>
            {/* 1. Deadline Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                    gridColumn: 'span 1',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 140,
                    borderRadius: 24,
                    // Premium Dark Gradient
                    background: 'linear-gradient(145deg, rgba(20,20,20,0.8) 0%, rgba(30,30,35,0.9) 100%)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16
                    }}>
                        <Calendar size={18} color="#94a3b8" />
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.02em' }}>
                        Дедлайн
                    </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    {formatDate(order.deadline)}
                </div>
            </motion.div>

            {/* 2. Price Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                    gridColumn: 'span 1',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 140,
                    borderRadius: 24,
                    // Gold Gradient
                    background: 'linear-gradient(145deg, rgba(212,175,55,0.1) 0%, rgba(20,20,20,0.8) 100%)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    boxShadow: '0 10px 30px -5px rgba(212,175,55,0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: 60, height: 60,
                    background: 'radial-gradient(circle at top right, rgba(212,175,55,0.2), transparent 70%)',
                    filter: 'blur(10px)'
                }} />

                <div>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: 'rgba(212,175,55,0.15)',
                        border: '1px solid rgba(212,175,55,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16
                    }}>
                        <Coins size={18} color="#d4af37" />
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(212,175,55,0.8)', fontWeight: 600, letterSpacing: '0.02em' }}>
                        Бюджет
                    </div>
                </div>

                {order.final_price > 0 ? (
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#d4af37', letterSpacing: '-0.01em' }}>
                        {order.final_price.toLocaleString()} ₽
                    </div>
                ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                        Оценка...
                    </div>
                )}
            </motion.div>

            {/* 3. Files Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileTap={hasFiles ? { scale: 0.98 } : {}}
                style={{
                    gridColumn: 'span 2',
                    padding: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 24,
                    cursor: hasFiles ? 'pointer' : 'default',
                    // Clean dark look
                    background: 'linear-gradient(145deg, rgba(20,20,20,0.9), rgba(25,25,25,0.95))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
                onClick={() => {
                    if (hasFiles && order.files_url) window.open(order.files_url, '_blank')
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48, height: 48,
                        borderRadius: 16,
                        background: hasFiles ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                        border: hasFiles ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {hasFiles ? (
                            <Download size={24} color="#22c55e" />
                        ) : (
                            <FileText size={24} color="#64748b" />
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 16, marginBottom: 4 }}>
                            {hasFiles ? 'Готовая работа' : 'Файлы заказа'}
                        </div>
                        <div style={{ fontSize: 13, color: hasFiles ? '#22c55e' : 'var(--text-muted)' }}>
                            {hasFiles ? 'Нажмите, чтобы скачать' : 'Материалы еще не загружены'}
                        </div>
                    </div>
                </div>
                {hasFiles && (
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ArrowUpRight size={18} color="#fff" />
                    </div>
                )}
            </motion.div>

            {/* 4. Subject Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                    gridColumn: 'span 2',
                    padding: 24,
                    borderRadius: 24,
                    background: 'rgba(20,20,20,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 600,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Тема работы
                </div>
                <div style={{
                    fontSize: 15,
                    color: 'var(--text-main)',
                    lineHeight: 1.6,
                    fontWeight: 500,
                    fontFamily: 'var(--font-serif)', // Elegant
                }}>
                    {order.subject}
                </div>
            </motion.div>

        </div>
    )
}

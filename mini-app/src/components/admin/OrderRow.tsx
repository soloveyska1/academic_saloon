import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown, ChevronRight, DollarSign, MessageSquare, FileUp, Truck,
    CheckCircle, XCircle, MoreHorizontal, Clock, User, Calendar
} from 'lucide-react'
import { Order } from '../../types'

interface OrderRowProps {
    order: Order
    isExpanded: boolean
    onToggleExpand: () => void
    onQuickAction: (action: string, order: Order) => void
    onSelect?: (order: Order) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Черновик', color: 'text-gray-400', bg: 'bg-gray-500' },
    pending: { label: 'Новый', color: 'text-red-400', bg: 'bg-red-500' },
    waiting_estimation: { label: 'Оценка', color: 'text-orange-400', bg: 'bg-orange-500' },
    waiting_payment: { label: 'Ожидает оплаты', color: 'text-yellow-400', bg: 'bg-yellow-500' },
    verification_pending: { label: 'Проверка', color: 'text-purple-400', bg: 'bg-purple-500' },
    confirmed: { label: 'Подтвержден', color: 'text-cyan-400', bg: 'bg-cyan-500' },
    paid: { label: 'Оплачен 50%', color: 'text-blue-400', bg: 'bg-blue-500' },
    paid_full: { label: 'Оплачен', color: 'text-blue-400', bg: 'bg-blue-600' },
    in_progress: { label: 'В работе', color: 'text-cyan-400', bg: 'bg-cyan-500' },
    review: { label: 'На проверке', color: 'text-indigo-400', bg: 'bg-indigo-500' },
    revision: { label: 'Доработка', color: 'text-amber-400', bg: 'bg-amber-500' },
    completed: { label: 'Завершен', color: 'text-emerald-400', bg: 'bg-emerald-500' },
    cancelled: { label: 'Отменен', color: 'text-gray-400', bg: 'bg-gray-600' },
    rejected: { label: 'Отклонен', color: 'text-red-400', bg: 'bg-red-600' },
}

export const OrderRow: React.FC<OrderRowProps> = ({
    order,
    isExpanded,
    onToggleExpand,
    onQuickAction,
    onSelect,
}) => {
    const [showActions, setShowActions] = useState(false)
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft

    const getQuickActions = () => {
        const actions: Array<{ id: string; label: string; icon: React.ElementType; color?: string }> = []

        // Price action for pending orders
        if (['pending', 'waiting_estimation', 'draft'].includes(order.status)) {
            actions.push({ id: 'setPrice', label: 'Установить цену', icon: DollarSign, color: 'text-yellow-400' })
        }

        // Payment verification
        if (order.status === 'verification_pending') {
            actions.push({ id: 'confirmPayment', label: 'Подтвердить оплату', icon: CheckCircle, color: 'text-emerald-400' })
            actions.push({ id: 'rejectPayment', label: 'Отклонить', icon: XCircle, color: 'text-red-400' })
        }

        // File upload for paid orders
        if (['paid', 'paid_full', 'in_progress'].includes(order.status)) {
            actions.push({ id: 'uploadFiles', label: 'Загрузить файлы', icon: FileUp, color: 'text-cyan-400' })
            actions.push({ id: 'deliver', label: 'Отправить клиенту', icon: Truck, color: 'text-emerald-400' })
        }

        // Message is always available
        actions.push({ id: 'message', label: 'Сообщение', icon: MessageSquare })

        return actions
    }

    const getDaysAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Сегодня'
        if (diffDays === 1) return 'Вчера'
        return `${diffDays} дн. назад`
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
        >
            {/* Main Row */}
            <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={onToggleExpand}
            >
                {/* Expand Icon */}
                <button className="text-zinc-500 hover:text-white transition-colors">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                    ) : (
                        <ChevronRight className="w-5 h-5" />
                    )}
                </button>

                {/* Order ID & Status */}
                <div className="flex items-center gap-3 min-w-[120px]">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusConfig.bg}`} />
                    <div>
                        <div className="font-mono font-bold text-white">#{order.id}</div>
                        <div className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</div>
                    </div>
                </div>

                {/* Subject */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                        {order.subject || 'Без предмета'}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                        {order.work_type || 'Не указан тип'}
                    </div>
                </div>

                {/* Price */}
                <div className="text-right min-w-[100px]">
                    <div className="font-bold text-white">
                        {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
                    </div>
                    {order.promo_code && (
                        <div className="text-xs text-purple-400">🎟️ {order.promo_code}</div>
                    )}
                </div>

                {/* Date */}
                <div className="text-right min-w-[80px] text-xs text-zinc-500">
                    {getDaysAgo(order.created_at || new Date().toISOString())}
                </div>

                {/* Quick Actions Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setShowActions(!showActions)}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {showActions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
                            >
                                {getQuickActions().map((action) => {
                                    const Icon = action.icon
                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => {
                                                onQuickAction(action.id, order)
                                                setShowActions(false)
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-800 transition-colors ${
                                                action.color || 'text-zinc-300'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {action.label}
                                        </button>
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800"
                    >
                        <div className="p-4 space-y-4">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">Клиент</div>
                                        <div className="text-sm text-white">ID: {order.user_id}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">Дедлайн</div>
                                        <div className="text-sm text-white">{order.deadline || 'Не указан'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">Прогресс</div>
                                        <div className="text-sm text-white">{order.progress || 0}%</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">Оплачено</div>
                                        <div className="text-sm text-emerald-400">
                                            {(order.paid_amount || 0).toLocaleString('ru-RU')} ₽
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Breakdown */}
                            {order.promo_code && (
                                <div className="p-3 bg-zinc-800/50 rounded-xl text-xs space-y-1">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Базовая цена:</span>
                                        <span>{order.price?.toLocaleString('ru-RU')} ₽</span>
                                    </div>
                                    <div className="flex justify-between text-purple-400">
                                        <span>🎟️ Промокод ({order.promo_code}):</span>
                                        <span>-{order.promo_discount || 0}%</span>
                                    </div>
                                    {(order.discount || 0) > 0 && (
                                        <div className="flex justify-between text-blue-400">
                                            <span>Скидка лояльности:</span>
                                            <span>-{order.discount}%</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-700">
                                        <span>Итого:</span>
                                        <span>{(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽</span>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {getQuickActions().map((action) => {
                                    const Icon = action.icon
                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => onQuickAction(action.id, order)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-sm transition-colors hover:bg-zinc-800 ${
                                                action.color || 'text-zinc-300'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {action.label}
                                        </button>
                                    )
                                })}
                                <button
                                    onClick={() => onSelect?.(order)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm transition-colors hover:bg-emerald-500/20"
                                >
                                    Открыть полностью
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

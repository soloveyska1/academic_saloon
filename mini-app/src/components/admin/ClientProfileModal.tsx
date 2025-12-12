import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, User, Calendar, DollarSign, Package, Star,
    TrendingUp, Users, Clock, Ban, MessageSquare
} from 'lucide-react'
import { ClientProfile } from '../../types'
import { fetchClientProfile } from '../../api/userApi'

interface ClientProfileModalProps {
    isOpen: boolean
    userId: number | null
    onClose: () => void
    onSendMessage?: (userId: number) => void
}

const SEGMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: 'Новый', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    active: { label: 'Активный', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    vip: { label: 'VIP', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    dormant: { label: 'Спящий', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    churned: { label: 'Ушедший', color: 'text-red-400', bg: 'bg-red-500/10' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Новый', color: 'text-red-400' },
    waiting_payment: { label: 'Ожидает оплаты', color: 'text-yellow-400' },
    paid: { label: 'Оплачен', color: 'text-blue-400' },
    paid_full: { label: 'Оплачен полностью', color: 'text-blue-400' },
    in_progress: { label: 'В работе', color: 'text-cyan-400' },
    completed: { label: 'Завершён', color: 'text-emerald-400' },
    cancelled: { label: 'Отменён', color: 'text-zinc-400' },
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
    isOpen,
    userId,
    onClose,
    onSendMessage,
}) => {
    const [profile, setProfile] = useState<ClientProfile | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && userId) {
            loadProfile(userId)
        }
    }, [isOpen, userId])

    const loadProfile = async (id: number) => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await fetchClientProfile(id)
            setProfile(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка загрузки профиля')
        } finally {
            setIsLoading(false)
        }
    }

    const segmentConfig = profile ? SEGMENT_CONFIG[profile.segment] || SEGMENT_CONFIG.new : SEGMENT_CONFIG.new

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10">
                                    <User className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Профиль клиента</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12 text-red-400">{error}</div>
                            ) : profile ? (
                                <div className="space-y-6">
                                    {/* User Header */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                                            {profile.rank_emoji}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-white">{profile.fullname}</h3>
                                                {profile.is_banned && (
                                                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                                                        <Ban className="w-3 h-3" /> Заблокирован
                                                    </span>
                                                )}
                                            </div>
                                            {profile.username && (
                                                <p className="text-zinc-400">@{profile.username}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${segmentConfig.bg} ${segmentConfig.color}`}>
                                                    {segmentConfig.label}
                                                </span>
                                                <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs">
                                                    {profile.rank_name}
                                                </span>
                                                <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs">
                                                    {profile.loyalty_status}
                                                </span>
                                            </div>
                                        </div>
                                        {onSendMessage && (
                                            <button
                                                onClick={() => onSendMessage(profile.telegram_id)}
                                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                <MessageSquare className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                                <DollarSign className="w-3 h-3" />
                                                Потрачено
                                            </div>
                                            <div className="text-lg font-bold text-white">
                                                {profile.total_spent.toLocaleString('ru-RU')} ₽
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                                <Package className="w-3 h-3" />
                                                Заказов
                                            </div>
                                            <div className="text-lg font-bold text-white">
                                                {profile.orders_count}
                                                <span className="text-sm text-emerald-400 ml-1">
                                                    ({profile.completed_orders} ✓)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                                <Star className="w-3 h-3" />
                                                Баланс
                                            </div>
                                            <div className="text-lg font-bold text-emerald-400">
                                                {profile.balance.toLocaleString('ru-RU')} ₽
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                                <TrendingUp className="w-3 h-3" />
                                                Скидка
                                            </div>
                                            <div className="text-lg font-bold text-amber-400">
                                                {profile.loyalty_discount}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referrals */}
                                    {profile.referrals_count > 0 && (
                                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="w-4 h-4 text-purple-400" />
                                                <span className="text-sm font-medium text-purple-400">Рефералы</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="text-2xl font-bold text-white">{profile.referrals_count}</div>
                                                    <div className="text-xs text-zinc-500">приглашено</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-emerald-400">
                                                        {profile.referral_earnings.toLocaleString('ru-RU')} ₽
                                                    </div>
                                                    <div className="text-xs text-zinc-500">заработано</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Orders History */}
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            История заказов
                                        </h4>
                                        {profile.orders.length === 0 ? (
                                            <div className="text-center py-8 text-zinc-500">Нет заказов</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {profile.orders.map((order) => {
                                                    const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-zinc-400' }
                                                    return (
                                                        <div
                                                            key={order.id}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-mono text-sm text-white">#{order.id}</span>
                                                                <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-medium text-white">
                                                                    {order.final_price.toLocaleString('ru-RU')} ₽
                                                                </div>
                                                                <div className="text-xs text-zinc-500">
                                                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dates */}
                                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-zinc-800">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Регистрация: {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU') : 'Н/Д'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Последняя активность: {profile.last_active ? new Date(profile.last_active).toLocaleDateString('ru-RU') : 'Н/Д'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-500">Выберите клиента</div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

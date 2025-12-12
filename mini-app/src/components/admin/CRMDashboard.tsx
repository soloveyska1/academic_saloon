import React from 'react'
import { motion } from 'framer-motion'
import {
    DollarSign, Package, CreditCard, TrendingUp,
    AlertCircle, Activity
} from 'lucide-react'
import { KPICard, QuickStats } from './KPICard'
import { AdminStats } from '../../types'

interface CRMDashboardProps {
    stats: AdminStats | null
    isLoading?: boolean
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({ stats, isLoading }) => {
    if (isLoading || !stats) {
        return (
            <div className="space-y-6">
                {/* Skeleton Loading */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse" />
            </div>
        )
    }

    // Calculate derived stats
    const pendingOrders = stats.orders_by_status?.pending || 0
    const paymentPending = stats.orders_by_status?.verification_pending || 0
    const inProgress = stats.orders_by_status?.in_progress || 0
    const completedToday = stats.completed_today || 0

    const revenueGrowth = stats.revenue_last_week && stats.revenue_this_week
        ? Math.round(((stats.revenue_this_week - stats.revenue_last_week) / stats.revenue_last_week) * 100)
        : 0

    return (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Выручка (месяц)"
                    value={`${(stats.revenue || 0).toLocaleString('ru-RU')} ₽`}
                    trend={{ value: revenueGrowth, label: 'vs прошлая неделя' }}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="emerald"
                />
                <KPICard
                    title="Активные заказы"
                    value={stats.active_orders_count || 0}
                    subtitle={`${inProgress} в работе`}
                    icon={<Package className="w-5 h-5" />}
                    color="blue"
                />
                <KPICard
                    title="Ожидают оплаты"
                    value={paymentPending}
                    subtitle="требуют проверки"
                    icon={<CreditCard className="w-5 h-5" />}
                    color={paymentPending > 0 ? 'amber' : 'emerald'}
                />
                <KPICard
                    title="Новые заказы"
                    value={pendingOrders}
                    subtitle="ждут оценки"
                    icon={<AlertCircle className="w-5 h-5" />}
                    color={pendingOrders > 0 ? 'red' : 'emerald'}
                />
            </div>

            {/* Quick Stats Bar */}
            <QuickStats
                stats={[
                    { label: 'Всего клиентов', value: stats.total_users_count || 0 },
                    { label: 'Новых сегодня', value: stats.new_users_today || 0, color: 'emerald' },
                    { label: 'Завершено сегодня', value: completedToday, color: 'blue' },
                    { label: 'Средний чек', value: `${Math.round(stats.average_order_value || 0).toLocaleString('ru-RU')} ₽` },
                ]}
            />

            {/* Orders by Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800"
            >
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                    Заказы по статусам
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { key: 'pending', label: 'Новые', color: 'bg-red-500', textColor: 'text-red-400' },
                        { key: 'waiting_payment', label: 'Ожидают оплаты', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                        { key: 'in_progress', label: 'В работе', color: 'bg-blue-500', textColor: 'text-blue-400' },
                        { key: 'review', label: 'На проверке', color: 'bg-indigo-500', textColor: 'text-indigo-400' },
                        { key: 'completed', label: 'Завершены', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                    ].map((status) => {
                        const count = (stats.orders_by_status as Record<string, number>)?.[status.key] || 0
                        return (
                            <div key={status.key} className="text-center">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${status.color}/10 mb-2`}>
                                    <span className={`text-xl font-bold ${status.textColor}`}>{count}</span>
                                </div>
                                <div className="text-xs text-zinc-500">{status.label}</div>
                            </div>
                        )
                    })}
                </div>
            </motion.div>

            {/* Activity Timeline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800"
            >
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Последняя активность
                </h3>
                <div className="space-y-3">
                    {stats.recent_activity?.length ? (
                        stats.recent_activity.slice(0, 5).map((activity, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                            >
                                <div className={`w-2 h-2 rounded-full ${
                                    activity.type === 'order' ? 'bg-blue-500' :
                                    activity.type === 'payment' ? 'bg-emerald-500' :
                                    'bg-zinc-500'
                                }`} />
                                <div className="flex-1 text-sm text-zinc-300">
                                    {activity.message}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {activity.time}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                            Нет недавней активности
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Revenue Chart Placeholder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Выручка за 30 дней
                    </h3>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-zinc-400">Этот месяц</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-zinc-600" />
                            <span className="text-zinc-400">Прошлый месяц</span>
                        </div>
                    </div>
                </div>

                {/* Simple Bar Chart Visualization */}
                <div className="h-48 flex items-end gap-1">
                    {[...Array(30)].map((_, i) => {
                        const height = Math.random() * 100 + 20
                        const isToday = i === 29
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                                    isToday ? 'bg-emerald-500' : 'bg-emerald-500/30'
                                }`}
                                style={{ height: `${height}%` }}
                                title={`День ${i + 1}`}
                            />
                        )
                    })}
                </div>

                <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
                    <span>1 дек</span>
                    <span>15 дек</span>
                    <span>Сегодня</span>
                </div>
            </motion.div>
        </div>
    )
}

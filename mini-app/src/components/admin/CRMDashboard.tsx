import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Package, TrendingUp, Users } from 'lucide-react'
import { AdminStats, RevenueChartData } from '../../types'
import { fetchRevenueChart } from '../../api/userApi'

interface CRMDashboardProps {
    stats: AdminStats | null
    isLoading?: boolean
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({ stats, isLoading }) => {
    const [chartData, setChartData] = useState<RevenueChartData | null>(null)
    const [chartLoading, setChartLoading] = useState(false)

    useEffect(() => {
        const loadChart = async () => {
            setChartLoading(true)
            try {
                const data = await fetchRevenueChart(30)
                setChartData(data)
            } catch (e) {
                console.error('Failed to load chart:', e)
            } finally {
                setChartLoading(false)
            }
        }
        if (stats) {
            loadChart()
        }
    }, [stats])

    if (isLoading || !stats) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-32 bg-zinc-900/50 rounded-xl animate-pulse" />
            </div>
        )
    }

    // Calculate derived stats
    const inProgress = stats.orders_by_status?.in_progress || 0
    const revenueGrowth = stats.revenue_last_week && stats.revenue_this_week
        ? Math.round(((stats.revenue_this_week - stats.revenue_last_week) / stats.revenue_last_week) * 100)
        : 0

    return (
        <div className="space-y-4">
            {/* Compact KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Выручка
                    </div>
                    <div className="text-lg font-bold text-emerald-400">
                        {(stats.revenue || 0).toLocaleString('ru-RU')} ₽
                    </div>
                    {revenueGrowth !== 0 && (
                        <div className={`text-xs ${revenueGrowth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% за неделю
                        </div>
                    )}
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                        <Package className="w-3.5 h-3.5" />
                        Активных
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                        {stats.active_orders_count || 0}
                    </div>
                    <div className="text-xs text-zinc-500">
                        {inProgress} в работе
                    </div>
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Клиентов
                    </div>
                    <div className="text-lg font-bold text-white">
                        {stats.total_users_count || 0}
                    </div>
                    <div className="text-xs text-emerald-500">
                        +{stats.new_users_today || 0} сегодня
                    </div>
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ср. чек
                    </div>
                    <div className="text-lg font-bold text-white">
                        {Math.round(stats.average_order_value || 0).toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-xs text-zinc-500">
                        {stats.completed_today || 0} завершено
                    </div>
                </div>
            </div>

            {/* Compact Revenue Chart */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">Выручка за 30 дней</span>
                    {chartData && (
                        <span className="text-sm text-emerald-400 font-bold">
                            {chartData.total.toLocaleString('ru-RU')} ₽
                        </span>
                    )}
                </div>

                {chartLoading ? (
                    <div className="h-24 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : chartData && chartData.data.length > 0 ? (
                    <div className="h-24 flex items-end gap-0.5">
                        {(() => {
                            const maxRevenue = Math.max(...chartData.data.map(d => d.revenue), 1)
                            return chartData.data.map((day, i) => {
                                const height = (day.revenue / maxRevenue) * 100
                                const isToday = i === chartData.data.length - 1
                                return (
                                    <div
                                        key={day.date}
                                        className={`flex-1 rounded-t transition-all ${
                                            isToday ? 'bg-emerald-500' : day.revenue > 0 ? 'bg-emerald-500/40' : 'bg-zinc-700/20'
                                        }`}
                                        style={{ height: `${Math.max(height, 2)}%` }}
                                        title={`${day.revenue.toLocaleString('ru-RU')} ₽`}
                                    />
                                )
                            })
                        })()}
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-zinc-500 text-sm">
                        Нет данных
                    </div>
                )}
            </motion.div>
        </div>
    )
}

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
    title: string
    value: string | number
    subtitle?: string
    trend?: {
        value: number
        label: string
    }
    icon?: React.ReactNode
    color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
    size?: 'sm' | 'md' | 'lg'
}

const colorMap = {
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: 'bg-emerald-500/20 text-emerald-400',
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        icon: 'bg-blue-500/20 text-blue-400',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: 'bg-amber-500/20 text-amber-400',
    },
    red: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: 'bg-red-500/20 text-red-400',
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        icon: 'bg-purple-500/20 text-purple-400',
    },
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    trend,
    icon,
    color = 'emerald',
    size = 'md',
}) => {
    const colors = colorMap[color]
    const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null

    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    }

    const valueClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className={`rounded-2xl border ${colors.border} ${colors.bg} ${sizeClasses[size]} transition-all`}
        >
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {title}
                </span>
                {icon && (
                    <div className={`p-2 rounded-xl ${colors.icon}`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className={`font-bold ${colors.text} ${valueClasses[size]} mb-1`}>
                {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
            </div>

            {(subtitle || trend) && (
                <div className="flex items-center gap-2 text-xs">
                    {trend && TrendIcon && (
                        <span className={`flex items-center gap-1 ${
                            trend.value > 0 ? 'text-emerald-400' :
                            trend.value < 0 ? 'text-red-400' :
                            'text-zinc-500'
                        }`}>
                            <TrendIcon className="w-3 h-3" />
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                    {subtitle && (
                        <span className="text-zinc-500">{subtitle}</span>
                    )}
                    {trend?.label && (
                        <span className="text-zinc-600">{trend.label}</span>
                    )}
                </div>
            )}
        </motion.div>
    )
}

// Quick Stats Row Component
interface QuickStatsProps {
    stats: Array<{
        label: string
        value: string | number
        color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
    }>
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
    return (
        <div className="flex items-center gap-6 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
            {stats.map((stat, index) => (
                <React.Fragment key={stat.label}>
                    <div className="text-center">
                        <div className={`text-lg font-bold ${
                            stat.color ? colorMap[stat.color].text : 'text-white'
                        }`}>
                            {typeof stat.value === 'number' ? stat.value.toLocaleString('ru-RU') : stat.value}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">{stat.label}</div>
                    </div>
                    {index < stats.length - 1 && (
                        <div className="w-px h-8 bg-zinc-800" />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

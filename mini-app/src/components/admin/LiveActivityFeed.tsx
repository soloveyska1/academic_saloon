import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertCircle, CreditCard, Package, User, CheckCircle,
    RefreshCw, Volume2, VolumeX, Bell
} from 'lucide-react'
import { useAdminLiveFeed } from '../../hooks/useAdminLiveFeed'
import { LiveEvent, LiveEventType, LiveEventPriority } from '../../types'

interface LiveActivityFeedProps {
    onOrderClick?: (orderId: number) => void
    onUserClick?: (userId: number) => void
    className?: string
}

const EVENT_CONFIG: Record<LiveEventType, { icon: React.ReactNode; color: string }> = {
    new_order: { icon: <Package className="w-4 h-4" />, color: 'red' },
    payment_received: { icon: <CreditCard className="w-4 h-4" />, color: 'purple' },
    needs_estimation: { icon: <AlertCircle className="w-4 h-4" />, color: 'orange' },
    new_user: { icon: <User className="w-4 h-4" />, color: 'blue' },
    order_completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'green' },
    status_changed: { icon: <RefreshCw className="w-4 h-4" />, color: 'gray' },
}

const PRIORITY_STYLES: Record<LiveEventPriority, string> = {
    critical: 'border-l-4 border-l-red-500 bg-red-500/10',
    high: 'border-l-4 border-l-orange-500 bg-orange-500/5',
    normal: 'border-l-2 border-l-zinc-600 bg-zinc-800/30',
    low: 'bg-zinc-800/20',
}

const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return 'сейчас'
    if (diffMin < 60) return `${diffMin} мин назад`

    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours} ч назад`

    return date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EventItem: React.FC<{
    event: LiveEvent
    onOrderClick?: (orderId: number) => void
    onUserClick?: (userId: number) => void
}> = ({ event, onOrderClick, onUserClick }) => {
    const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.status_changed
    const priorityStyle = PRIORITY_STYLES[event.priority]

    const handleClick = () => {
        if (event.order_id && onOrderClick) {
            onOrderClick(event.order_id)
        } else if (event.user_id && onUserClick) {
            onUserClick(event.user_id)
        }
    }

    const isClickable = (event.order_id && onOrderClick) || (event.user_id && onUserClick)

    return (
        <motion.div
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`
                p-3 rounded-lg ${priorityStyle}
                ${isClickable ? 'cursor-pointer hover:bg-zinc-700/50' : ''}
                transition-colors
            `}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    bg-${config.color}-500/20 text-${config.color}-400
                `}>
                    {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white text-sm truncate">
                            {event.title}
                        </span>
                        <span className="text-xs text-zinc-500 shrink-0">
                            {formatTime(event.timestamp)}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-400 truncate mt-0.5">
                        {event.message}
                    </p>
                    {event.amount && (
                        <span className="text-xs text-emerald-400 font-medium">
                            {event.amount.toLocaleString('ru-RU')} ₽
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
    onOrderClick,
    onUserClick,
    className = '',
}) => {
    const [soundEnabled, setSoundEnabled] = React.useState(true)

    const { feed, isLoading, newEventsCount, refresh, clearNewEvents, lastUpdate } = useAdminLiveFeed({
        enabled: true,
        pollInterval: 10000, // 10 seconds
        soundEnabled,
    })

    const handleRefresh = async () => {
        await refresh()
        clearNewEvents()
    }

    return (
        <div className={`bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="w-5 h-5 text-zinc-400" />
                            {newEventsCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                                    {newEventsCount > 9 ? '9+' : newEventsCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Live</h3>
                            <p className="text-xs text-zinc-500">
                                {lastUpdate ? `Обновлено ${formatTime(lastUpdate.toISOString())}` : 'Загрузка...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sound toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-lg transition-colors ${
                                soundEnabled
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-zinc-800 text-zinc-500'
                            }`}
                            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>

                        {/* Refresh button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                            title="Обновить"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Counters */}
                {feed && (
                    <div className="flex gap-4 mt-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            feed.counters.pending_orders > 0 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                            <Package className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                                {feed.counters.pending_orders} новых
                            </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            feed.counters.pending_payments > 0 ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                                {feed.counters.pending_payments} оплат
                            </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            feed.counters.needs_estimation > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                                {feed.counters.needs_estimation} оценок
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Events list */}
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {!feed || feed.events.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                        {isLoading ? 'Загрузка...' : 'Нет новых событий'}
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {feed.events.map((event) => (
                            <EventItem
                                key={event.id}
                                event={event}
                                onOrderClick={onOrderClick}
                                onUserClick={onUserClick}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Critical alert banner */}
            {feed?.has_critical && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-red-500/20 border-t border-red-500/30"
                >
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Требуется внимание! Есть срочные события
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    )
}

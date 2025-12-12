import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, ChevronDown, RefreshCw } from 'lucide-react'

export interface OrderFiltersState {
    search: string
    status: string[]
    sortBy: 'created' | 'price' | 'deadline' | 'id'
    sortOrder: 'asc' | 'desc'
}

interface OrderFiltersProps {
    filters: OrderFiltersState
    onFiltersChange: (filters: OrderFiltersState) => void
    onRefresh: () => void
    isLoading?: boolean
    totalCount?: number
    filteredCount?: number
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Ожидает', color: 'bg-red-500' },
    { value: 'waiting_estimation', label: 'Оценка', color: 'bg-orange-500' },
    { value: 'waiting_payment', label: 'Ожидает оплаты', color: 'bg-yellow-500' },
    { value: 'verification_pending', label: 'Проверка оплаты', color: 'bg-purple-500' },
    { value: 'paid', label: 'Оплачен (50%)', color: 'bg-blue-500' },
    { value: 'paid_full', label: 'Оплачен (100%)', color: 'bg-blue-600' },
    { value: 'in_progress', label: 'В работе', color: 'bg-cyan-500' },
    { value: 'review', label: 'На проверке', color: 'bg-indigo-500' },
    { value: 'revision', label: 'Доработка', color: 'bg-amber-500' },
    { value: 'completed', label: 'Завершен', color: 'bg-emerald-500' },
    { value: 'cancelled', label: 'Отменен', color: 'bg-gray-500' },
]

export const OrderFilters: React.FC<OrderFiltersProps> = ({
    filters,
    onFiltersChange,
    onRefresh,
    isLoading,
    totalCount,
    filteredCount,
}) => {
    const [showStatusDropdown, setShowStatusDropdown] = useState(false)

    const handleSearchChange = (search: string) => {
        onFiltersChange({ ...filters, search })
    }

    const handleStatusToggle = (status: string) => {
        const newStatuses = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status]
        onFiltersChange({ ...filters, status: newStatuses })
    }

    const handleClearFilters = () => {
        onFiltersChange({
            search: '',
            status: [],
            sortBy: 'created',
            sortOrder: 'desc',
        })
    }

    const hasActiveFilters = filters.search || filters.status.length > 0

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Поиск по ID, имени, предмету..."
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    {filters.search && (
                        <button
                            onClick={() => handleSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Status Filter Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                            filters.status.length > 0
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">Статус</span>
                        {filters.status.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold">
                                {filters.status.length}
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showStatusDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                            >
                                <div className="p-2 max-h-80 overflow-y-auto">
                                    {STATUS_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleStatusToggle(option.value)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                filters.status.includes(option.value)
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'text-zinc-400 hover:bg-zinc-800'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${option.color}`} />
                                            <span className="flex-1 text-left">{option.label}</span>
                                            {filters.status.includes(option.value) && (
                                                <span className="text-emerald-400">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-zinc-800">
                                    <button
                                        onClick={() => onFiltersChange({ ...filters, status: [] })}
                                        className="w-full px-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors"
                                    >
                                        Сбросить фильтры статуса
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Active Filters & Stats */}
            {(hasActiveFilters || filteredCount !== undefined) && (
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Сбросить все
                            </button>
                        )}
                        {filters.status.map((status) => {
                            const option = STATUS_OPTIONS.find(o => o.value === status)
                            return (
                                <span
                                    key={status}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${option?.color || 'bg-gray-500'}`} />
                                    {option?.label || status}
                                    <button
                                        onClick={() => handleStatusToggle(status)}
                                        className="ml-1 text-zinc-500 hover:text-white"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )
                        })}
                    </div>

                    {filteredCount !== undefined && totalCount !== undefined && (
                        <span className="text-zinc-500">
                            Показано: <span className="text-white">{filteredCount}</span> из {totalCount}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

// Quick Filter Buttons (Alternative compact view)
interface QuickFilterProps {
    activeFilter: string
    onFilterChange: (filter: string) => void
    counts?: Record<string, number>
}

export const QuickFilterButtons: React.FC<QuickFilterProps> = ({
    activeFilter,
    onFilterChange,
    counts = {},
}) => {
    const quickFilters = [
        { id: 'all', label: 'Все' },
        { id: 'pending', label: 'Новые', color: 'red' },
        { id: 'payment', label: 'Оплата', color: 'yellow' },
        { id: 'in_progress', label: 'В работе', color: 'blue' },
        { id: 'completed', label: 'Готово', color: 'emerald' },
    ]

    return (
        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl">
            {quickFilters.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeFilter === filter.id
                            ? 'bg-white text-black'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                    {filter.label}
                    {counts[filter.id] !== undefined && counts[filter.id] > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            activeFilter === filter.id
                                ? 'bg-black/20 text-black'
                                : `bg-${filter.color || 'zinc'}-500/20 text-${filter.color || 'zinc'}-400`
                        }`}>
                            {counts[filter.id]}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}

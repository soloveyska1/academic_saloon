import React from 'react'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, Package, Users, CreditCard, Terminal, Settings,
    ChevronRight, X, LogOut, HelpCircle
} from 'lucide-react'

export type AdminSection =
    | 'dashboard'
    | 'orders'
    | 'clients'
    | 'payments'
    | 'sql'
    | 'settings'

interface NavItem {
    id: AdminSection
    icon: React.ElementType
    label: string
    badge?: number
    children?: { id: string; label: string; badge?: number }[]
}

interface AdminSidebarProps {
    activeSection: AdminSection
    onSectionChange: (section: AdminSection) => void
    isOpen: boolean
    onClose: () => void
    stats?: {
        pendingOrders?: number
        pendingPayments?: number
        newClients?: number
    }
}

const navItems: NavItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Дашборд' },
    { id: 'orders', icon: Package, label: 'Заказы' },
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'payments', icon: CreditCard, label: 'Платежи' },
    { id: 'sql', icon: Terminal, label: 'SQL Консоль' },
    { id: 'settings', icon: Settings, label: 'Настройки' },
]

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
    activeSection,
    onSectionChange,
    isOpen,
    onClose,
    stats
}) => {
    const getBadge = (id: AdminSection): number | undefined => {
        switch (id) {
            case 'orders': return stats?.pendingOrders
            case 'payments': return stats?.pendingPayments
            case 'clients': return stats?.newClients
            default: return undefined
        }
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: isOpen ? 0 : -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed top-0 left-0 h-full w-[280px] bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col
                    lg:translate-x-0 lg:static lg:z-auto`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-white">Saloon CRM</h1>
                            <p className="text-xs text-zinc-500">Admin Panel v3.0</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = activeSection === item.id
                        const badge = getBadge(item.id)
                        const Icon = item.icon

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onSectionChange(item.id)
                                    onClose()
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                                    isActive
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                                {badge && badge > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        isActive ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                                    }`}>
                                        {badge}
                                    </span>
                                )}
                                {isActive && <ChevronRight className="w-4 h-4" />}
                            </button>
                        )
                    })}
                </nav>

                {/* Keyboard Shortcuts Hint */}
                <div className="p-3 mx-3 mb-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
                        <HelpCircle className="w-4 h-4" />
                        <span>Горячие клавиши</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">/</kbd>
                            <span className="text-zinc-500">Поиск</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">?</kbd>
                            <span className="text-zinc-500">Помощь</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">N</kbd>
                            <span className="text-zinc-500">Новый</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">Esc</kbd>
                            <span className="text-zinc-500">Закрыть</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-zinc-800">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Выход</span>
                    </button>
                </div>
            </motion.aside>
        </>
    )
}

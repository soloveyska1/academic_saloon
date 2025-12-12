import { useEffect, useCallback, useState } from 'react'

interface ShortcutConfig {
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    action: () => void
    description: string
    category?: string
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean
    shortcuts: ShortcutConfig[]
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
    const [showHelp, setShowHelp] = useState(false)

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return

        // Ignore if user is typing in an input
        const target = event.target as HTMLElement
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Allow Escape in inputs
            if (event.key !== 'Escape') return
        }

        // Handle help toggle with ?
        if (event.key === '?' && !event.ctrlKey && !event.altKey) {
            event.preventDefault()
            setShowHelp(prev => !prev)
            return
        }

        // Find matching shortcut
        const matchingShortcut = shortcuts.find(shortcut => {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
            const ctrlMatch = !!shortcut.ctrl === event.ctrlKey
            const shiftMatch = !!shortcut.shift === event.shiftKey
            const altMatch = !!shortcut.alt === event.altKey

            return keyMatch && ctrlMatch && shiftMatch && altMatch
        })

        if (matchingShortcut) {
            event.preventDefault()
            matchingShortcut.action()
        }
    }, [enabled, shortcuts])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return {
        showHelp,
        setShowHelp,
        shortcuts,
    }
}

// Pre-defined admin shortcuts generator
export function createAdminShortcuts(handlers: {
    onSearch?: () => void
    onNewOrder?: () => void
    onRefresh?: () => void
    onDashboard?: () => void
    onOrders?: () => void
    onClients?: () => void
    onEscape?: () => void
    onSetPrice?: () => void
    onSendMessage?: () => void
    onUploadFiles?: () => void
}) {
    const shortcuts: ShortcutConfig[] = []

    if (handlers.onSearch) {
        shortcuts.push({
            key: '/',
            action: handlers.onSearch,
            description: 'Открыть поиск',
            category: 'Навигация',
        })
    }

    if (handlers.onNewOrder) {
        shortcuts.push({
            key: 'n',
            action: handlers.onNewOrder,
            description: 'Новый заказ',
            category: 'Действия',
        })
    }

    if (handlers.onRefresh) {
        shortcuts.push({
            key: 'r',
            action: handlers.onRefresh,
            description: 'Обновить данные',
            category: 'Навигация',
        })
    }

    if (handlers.onDashboard) {
        shortcuts.push({
            key: 'd',
            action: handlers.onDashboard,
            description: 'Перейти к дашборду',
            category: 'Навигация',
        })
    }

    if (handlers.onOrders) {
        shortcuts.push({
            key: 'o',
            action: handlers.onOrders,
            description: 'Перейти к заказам',
            category: 'Навигация',
        })
    }

    if (handlers.onClients) {
        shortcuts.push({
            key: 'c',
            action: handlers.onClients,
            description: 'Перейти к клиентам',
            category: 'Навигация',
        })
    }

    if (handlers.onEscape) {
        shortcuts.push({
            key: 'Escape',
            action: handlers.onEscape,
            description: 'Закрыть / Назад',
            category: 'Общее',
        })
    }

    if (handlers.onSetPrice) {
        shortcuts.push({
            key: 'p',
            action: handlers.onSetPrice,
            description: 'Установить цену',
            category: 'Заказ',
        })
    }

    if (handlers.onSendMessage) {
        shortcuts.push({
            key: 'm',
            action: handlers.onSendMessage,
            description: 'Отправить сообщение',
            category: 'Заказ',
        })
    }

    if (handlers.onUploadFiles) {
        shortcuts.push({
            key: 'u',
            action: handlers.onUploadFiles,
            description: 'Загрузить файлы',
            category: 'Заказ',
        })
    }

    return shortcuts
}

// Keyboard Shortcuts Help Modal Component
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

interface ShortcutsHelpModalProps {
    isOpen: boolean
    onClose: () => void
    shortcuts: ShortcutConfig[]
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
    isOpen,
    onClose,
    shortcuts,
}) => {
    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        const category = shortcut.category || 'Общее'
        if (!acc[category]) acc[category] = []
        acc[category].push(shortcut)
        return acc
    }, {} as Record<string, ShortcutConfig[]>)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10">
                                    <Keyboard className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Горячие клавиши</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                                        {category}
                                    </h3>
                                    <div className="space-y-1">
                                        {categoryShortcuts.map((shortcut) => (
                                            <div
                                                key={shortcut.key}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                            >
                                                <span className="text-sm text-zinc-300">
                                                    {shortcut.description}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.ctrl && (
                                                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                                                            Ctrl
                                                        </kbd>
                                                    )}
                                                    {shortcut.shift && (
                                                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                                                            Shift
                                                        </kbd>
                                                    )}
                                                    {shortcut.alt && (
                                                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                                                            Alt
                                                        </kbd>
                                                    )}
                                                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                                                        {shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase()}
                                                    </kbd>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Help shortcut hint */}
                            <div className="pt-4 border-t border-zinc-800">
                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                    <span>Нажмите <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono">?</kbd> чтобы открыть/закрыть эту панель</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

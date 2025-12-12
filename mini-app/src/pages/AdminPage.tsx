import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Lock, Terminal, Menu, Bell, Search, X, Send,
    DollarSign, CheckCircle, XCircle, Truck,
    Activity, ChevronDown, FileUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Components
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/Toast'
import {
    AdminSidebar,
    AdminSection,
    CRMDashboard,
    OrderFilters,
    OrderFiltersState,
    OrderRow,
    ClientProfileModal,
} from '../components/admin'
import {
    useKeyboardShortcuts,
    createAdminShortcuts,
    ShortcutsHelpModal,
} from '../hooks/useKeyboardShortcuts'

// Hooks & API
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useUserData } from '../hooks/useUserData'
import {
    AdminUser, AdminStats, AdminSqlResponse, Order, ChatMessage
} from '../types'
import {
    fetchAdminUsers, fetchAdminStats, executeAdminSql, fetchAdminOrders,
    updateAdminOrderStatus, updateAdminOrderPrice, sendAdminMessage, updateAdminOrderProgress,
    confirmGodPayment, rejectGodPayment, fetchOrderMessages, uploadOrderFiles
} from '../api/userApi'

// Order Statuses
const ORDER_STATUSES = [
    { value: 'draft', label: 'Черновик', color: 'gray' },
    { value: 'pending', label: 'Ожидает', color: 'red' },
    { value: 'waiting_estimation', label: 'Оценка', color: 'orange' },
    { value: 'waiting_payment', label: 'Ожидает оплаты', color: 'yellow' },
    { value: 'verification_pending', label: 'Проверка оплаты', color: 'purple' },
    { value: 'confirmed', label: 'Подтвержден', color: 'cyan' },
    { value: 'paid', label: 'Оплачен (50%)', color: 'blue' },
    { value: 'paid_full', label: 'Оплачен (100%)', color: 'blue' },
    { value: 'in_progress', label: 'В работе', color: 'blue' },
    { value: 'review', label: 'На проверке', color: 'indigo' },
    { value: 'revision', label: 'Доработка', color: 'amber' },
    { value: 'completed', label: 'Завершен', color: 'green' },
    { value: 'cancelled', label: 'Отменен', color: 'gray' },
    { value: 'rejected', label: 'Отклонен', color: 'red' },
]

const ACCESS_CODE_HASH = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'admin2024'

export const AdminPage: React.FC = () => {
    // Hooks
    const { trigger } = useHapticFeedback()
    const { userData } = useUserData()
    const navigate = useNavigate()
    const { showToast } = useToast()

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [accessCode, setAccessCode] = useState('')

    // UI State
    const [isLoading, setIsLoading] = useState(false)
    const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)

    // Data State
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [users, setUsers] = useState<AdminUser[]>([])
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 5')
    const [sqlResult, setSqlResult] = useState<AdminSqlResponse | null>(null)

    // Filters State
    const [filters, setFilters] = useState<OrderFiltersState>({
        search: '',
        status: [],
        sortBy: 'created',
        sortOrder: 'desc',
    })

    // Order Detail State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
    const [orderModalTab, setOrderModalTab] = useState<'info' | 'chat' | 'actions'>('info')

    // Client Profile State
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
    const [clientProfileOpen, setClientProfileOpen] = useState(false)

    // Action State
    const [priceInput, setPriceInput] = useState('')
    const [messageInput, setMessageInput] = useState('')
    const [progressInput, setProgressInput] = useState('')
    const [rejectReason, setRejectReason] = useState('')

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatLoading, setChatLoading] = useState(false)

    // File Upload State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Status dropdown
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

    // ═══════════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════

    const shortcuts = useMemo(() => createAdminShortcuts({
        onSearch: () => {
            setSearchFocused(true)
            searchInputRef.current?.focus()
        },
        onRefresh: () => loadData(),
        onDashboard: () => setActiveSection('dashboard'),
        onOrders: () => setActiveSection('orders'),
        onClients: () => setActiveSection('clients'),
        onEscape: () => {
            if (selectedOrder) {
                setSelectedOrder(null)
            } else if (searchFocused) {
                setSearchFocused(false)
                searchInputRef.current?.blur()
            }
        },
        onSetPrice: () => {
            if (selectedOrder) {
                setOrderModalTab('actions')
            }
        },
        onSendMessage: () => {
            if (selectedOrder) {
                setOrderModalTab('chat')
            }
        },
    }), [selectedOrder, searchFocused])

    const { showHelp, setShowHelp } = useKeyboardShortcuts({
        enabled: isAuthenticated,
        shortcuts,
    })

    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════

    const handleLogin = () => {
        if (accessCode === ACCESS_CODE_HASH) {
            trigger('success')
            setIsAuthenticated(true)
            showToast({ type: 'success', title: 'Добро пожаловать!', message: 'Вход в CRM выполнен' })
            loadData()
        } else {
            trigger('failure')
            showToast({ type: 'error', title: 'Доступ запрещен', message: 'Неверный код доступа' })
            setAccessCode('')
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════════════════════

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [s, o, u] = await Promise.all([
                fetchAdminStats(),
                fetchAdminOrders(),
                fetchAdminUsers()
            ])
            setStats(s)
            setOrders(o)
            setUsers(u)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ошибка загрузки данных'
            showToast({ type: 'error', title: 'Ошибка', message: errorMessage })
        } finally {
            setIsLoading(false)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FILTERED ORDERS
    // ═══════════════════════════════════════════════════════════════

    const filteredOrders = useMemo(() => {
        let result = [...orders]

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(order =>
                order.id.toString().includes(searchLower) ||
                (order.subject?.toLowerCase() || '').includes(searchLower) ||
                order.user_id?.toString().includes(searchLower) ||
                (order.promo_code?.toLowerCase() || '').includes(searchLower)
            )
        }

        // Status filter
        if (filters.status.length > 0) {
            result = result.filter(order => filters.status.includes(order.status))
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0
            switch (filters.sortBy) {
                case 'created':
                    comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                    break
                case 'price':
                    comparison = (b.final_price || 0) - (a.final_price || 0)
                    break
                case 'id':
                    comparison = b.id - a.id
                    break
            }
            return filters.sortOrder === 'desc' ? comparison : -comparison
        })

        return result
    }, [orders, filters])

    // ═══════════════════════════════════════════════════════════════
    // SQL EXECUTION
    // ═══════════════════════════════════════════════════════════════

    const handleSqlExecute = async () => {
        setIsLoading(true)
        try {
            const res = await executeAdminSql(sqlQuery)
            setSqlResult(res)
            trigger('touch')
            showToast({ type: 'success', title: 'Запрос выполнен', message: `Найдено: ${res.rows?.length || 0} строк` })
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ошибка выполнения запроса'
            setSqlResult({ error: errorMessage })
            trigger('failure')
            showToast({ type: 'error', title: 'Ошибка SQL', message: errorMessage })
        } finally {
            setIsLoading(false)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ORDER ACTIONS
    // ═══════════════════════════════════════════════════════════════

    const handleSetPrice = async () => {
        if (!selectedOrder || !priceInput) return
        try {
            await updateAdminOrderPrice(selectedOrder.id, parseFloat(priceInput))
            trigger('success')
            showToast({ type: 'success', title: 'Цена установлена', message: `Заказ #${selectedOrder.id}: ${priceInput} ₽` })
            setPriceInput('')
            loadData()
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось установить цену' })
        }
    }

    const handleSendMessage = async () => {
        if (!selectedOrder || !messageInput) return
        try {
            await sendAdminMessage(selectedOrder.id, messageInput)
            trigger('success')
            setMessageInput('')
            showToast({ type: 'success', title: 'Сообщение отправлено', message: `Клиенту заказа #${selectedOrder.id}` })
            loadChatMessages(selectedOrder.id)
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось отправить сообщение' })
        }
    }

    const handleSetStatus = async (status: string) => {
        if (!selectedOrder) return
        try {
            await updateAdminOrderStatus(selectedOrder.id, status)
            trigger('success')
            const statusLabel = ORDER_STATUSES.find(s => s.value === status)?.label || status
            showToast({ type: 'success', title: 'Статус изменен', message: `Заказ #${selectedOrder.id}: ${statusLabel}` })
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: status as Order['status'] } : null)
            setStatusDropdownOpen(false)
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось изменить статус' })
        }
    }

    const handleSetProgress = async () => {
        if (!selectedOrder || !progressInput) return
        try {
            await updateAdminOrderProgress(selectedOrder.id, parseInt(progressInput))
            trigger('success')
            showToast({ type: 'success', title: 'Прогресс обновлен', message: `Заказ #${selectedOrder.id}: ${progressInput}%` })
            setProgressInput('')
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось обновить прогресс' })
        }
    }

    // Load chat messages
    const loadChatMessages = useCallback(async (orderId: number) => {
        setChatLoading(true)
        try {
            const response = await fetchOrderMessages(orderId)
            setChatMessages(response.messages || [])
        } catch {
            setChatMessages([])
        } finally {
            setChatLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedOrder && orderModalTab === 'chat') {
            loadChatMessages(selectedOrder.id)
        }
    }, [selectedOrder, orderModalTab, loadChatMessages])

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT ACTIONS
    // ═══════════════════════════════════════════════════════════════

    const handleConfirmPayment = async (isFull: boolean) => {
        if (!selectedOrder) return
        try {
            await confirmGodPayment(selectedOrder.id, undefined, isFull)
            trigger('success')
            showToast({
                type: 'success',
                title: isFull ? 'Полная оплата подтверждена' : 'Предоплата подтверждена',
                message: `Заказ #${selectedOrder.id}`
            })
            loadData()
            setSelectedOrder(prev => prev ? {
                ...prev,
                status: isFull ? 'paid_full' as const : 'paid' as const,
                paid_amount: isFull ? (prev.final_price || 0) : Math.ceil((prev.final_price || 0) / 2)
            } : null)
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось подтвердить оплату' })
        }
    }

    const handleRejectPayment = async () => {
        if (!selectedOrder) return
        try {
            await rejectGodPayment(selectedOrder.id, rejectReason || 'Платеж не найден')
            trigger('failure')
            showToast({ type: 'info', title: 'Оплата отклонена', message: `Заказ #${selectedOrder.id}` })
            setRejectReason('')
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: 'waiting_payment' } : null)
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось отклонить оплату' })
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE UPLOAD
    // ═══════════════════════════════════════════════════════════════

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setSelectedFiles(files)
    }

    const handleFileUpload = async () => {
        if (!selectedOrder || selectedFiles.length === 0) return
        setIsUploading(true)
        setUploadProgress(0)
        try {
            await uploadOrderFiles(selectedOrder.id, selectedFiles, (percent) => {
                setUploadProgress(percent)
            })
            trigger('success')
            showToast({ type: 'success', title: 'Файлы загружены', message: `${selectedFiles.length} файл(ов) для заказа #${selectedOrder.id}` })
            setSelectedFiles([])
            setUploadProgress(0)
            loadData()
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось загрузить файлы' })
        } finally {
            setIsUploading(false)
        }
    }

    const handleMarkDelivered = async () => {
        if (!selectedOrder) return
        try {
            await updateAdminOrderStatus(selectedOrder.id, 'review')
            trigger('success')
            showToast({ type: 'success', title: 'Заказ отправлен', message: 'Клиент получит уведомление' })
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: 'review' } : null)
        } catch {
            showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось отправить заказ' })
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // QUICK ACTIONS HANDLER
    // ═══════════════════════════════════════════════════════════════

    const handleQuickAction = (action: string, order: Order) => {
        setSelectedOrder(order)
        switch (action) {
            case 'setPrice':
                setOrderModalTab('actions')
                break
            case 'confirmPayment':
                handleConfirmPayment(false)
                break
            case 'rejectPayment':
                setOrderModalTab('actions')
                break
            case 'uploadFiles':
                setOrderModalTab('actions')
                break
            case 'deliver':
                handleMarkDelivered()
                break
            case 'message':
                setOrderModalTab('chat')
                break
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER: LOGIN SCREEN
    // ═══════════════════════════════════════════════════════════════

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Saloon CRM</h1>
                        <p className="text-zinc-500 text-sm">Введите код доступа</p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="password"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-white text-xl tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                            placeholder="• • •"
                            value={accessCode}
                            onChange={e => setAccessCode(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl"
                            onClick={handleLogin}
                        >
                            <Terminal className="w-5 h-5 mr-2" />
                            Войти в систему
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER: MAIN CRM
    // ═══════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Sidebar */}
            <AdminSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                stats={{
                    pendingOrders: stats?.orders_by_status?.pending || 0,
                    pendingPayments: stats?.orders_by_status?.verification_pending || 0,
                    newClients: stats?.new_users_today || 0,
                }}
            />

            {/* Main Content */}
            <div className="lg:ml-[280px] min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <h1 className="text-lg font-bold capitalize">
                                {activeSection === 'dashboard' ? 'Дашборд' :
                                 activeSection === 'orders' ? 'Заказы' :
                                 activeSection === 'clients' ? 'Клиенты' :
                                 activeSection === 'payments' ? 'Платежи' :
                                 activeSection === 'sql' ? 'SQL Консоль' :
                                 activeSection === 'settings' ? 'Настройки' : activeSection}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Global Search */}
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Поиск... (/)"
                                    className="w-48 pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    value={filters.search}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, search: e.target.value }))
                                        if (activeSection !== 'orders') setActiveSection('orders')
                                    }}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                />
                            </div>

                            {/* Notifications */}
                            <button className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                                {(stats?.orders_by_status?.pending || 0) > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                        {stats?.orders_by_status?.pending}
                                    </span>
                                )}
                            </button>

                            {/* User Menu */}
                            <button
                                onClick={() => { setIsAuthenticated(false); navigate('/') }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <span className="text-xs hidden sm:inline">ID: {userData?.telegram_id}</span>
                                <X className="w-4 h-4 text-red-400" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-6 pb-24">
                    {/* DASHBOARD */}
                    {activeSection === 'dashboard' && (
                        <CRMDashboard stats={stats} isLoading={isLoading} />
                    )}

                    {/* ORDERS */}
                    {activeSection === 'orders' && (
                        <div className="space-y-4">
                            <OrderFilters
                                filters={filters}
                                onFiltersChange={setFilters}
                                onRefresh={loadData}
                                isLoading={isLoading}
                                totalCount={orders.length}
                                filteredCount={filteredOrders.length}
                            />

                            <div className="space-y-3">
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-500">
                                        {orders.length === 0 ? 'Нет заказов' : 'Не найдено заказов по фильтру'}
                                    </div>
                                ) : (
                                    filteredOrders.map(order => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            isExpanded={expandedOrderId === order.id}
                                            onToggleExpand={() => setExpandedOrderId(
                                                expandedOrderId === order.id ? null : order.id
                                            )}
                                            onQuickAction={handleQuickAction}
                                            onSelect={setSelectedOrder}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* CLIENTS */}
                    {activeSection === 'clients' && (
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                {users.map(u => (
                                    <motion.div
                                        key={u.internal_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedClientId(u.internal_id)
                                            setClientProfileOpen(true)
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                                    <span className="text-lg font-bold text-zinc-400">
                                                        {(u.fullname || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{u.fullname || 'Без имени'}</div>
                                                    <div className="text-sm text-zinc-500">
                                                        @{u.username || 'no_user'} • ID: {u.telegram_id}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {u.is_admin && (
                                                    <span className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                                                        ADMIN
                                                    </span>
                                                )}
                                                {u.is_banned && (
                                                    <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 text-xs">
                                                        Заблокирован
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedClientId(u.internal_id)
                                                        setClientProfileOpen(true)
                                                    }}
                                                    className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                                                >
                                                    Подробнее
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PAYMENTS */}
                    {activeSection === 'payments' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold">Ожидают подтверждения оплаты</h2>
                            {orders.filter(o => o.status === 'verification_pending').length === 0 ? (
                                <div className="text-center py-12 text-zinc-500">
                                    Нет платежей на проверке
                                </div>
                            ) : (
                                orders.filter(o => o.status === 'verification_pending').map(order => (
                                    <OrderRow
                                        key={order.id}
                                        order={order}
                                        isExpanded={expandedOrderId === order.id}
                                        onToggleExpand={() => setExpandedOrderId(
                                            expandedOrderId === order.id ? null : order.id
                                        )}
                                        onQuickAction={handleQuickAction}
                                        onSelect={setSelectedOrder}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* SQL CONSOLE */}
                    {activeSection === 'sql' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <p className="text-amber-400 text-sm">
                                    ⚠️ Осторожно! SQL консоль позволяет выполнять произвольные запросы к базе данных.
                                </p>
                            </div>

                            <textarea
                                value={sqlQuery}
                                onChange={(e) => setSqlQuery(e.target.value)}
                                className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-sm text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                                placeholder="SELECT * FROM users..."
                            />

                            <Button
                                onClick={handleSqlExecute}
                                disabled={isLoading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {isLoading ? 'Выполнение...' : 'Выполнить запрос'}
                            </Button>

                            {sqlResult && (
                                <div className="mt-4 overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-xl">
                                    {sqlResult.error ? (
                                        <div className="p-4 text-red-400 font-mono text-sm">{sqlResult.error}</div>
                                    ) : (
                                        <table className="w-full text-sm font-mono">
                                            <thead>
                                                <tr className="border-b border-zinc-800">
                                                    {sqlResult.columns?.map(col => (
                                                        <th key={col} className="p-3 text-left text-zinc-500 font-medium">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sqlResult.rows?.map((row, i) => (
                                                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="p-3 text-zinc-300 truncate max-w-[200px]">
                                                                {String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {sqlResult.rows && (
                                        <div className="p-3 text-zinc-500 text-xs border-t border-zinc-800">
                                            Найдено строк: {sqlResult.rows.length}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS */}
                    {activeSection === 'settings' && (
                        <div className="text-center py-12 text-zinc-500">
                            Настройки будут добавлены в следующей версии
                        </div>
                    )}
                </main>
            </div>

            {/* ORDER DETAIL MODAL */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-2xl max-h-[90vh] bg-zinc-900 rounded-t-3xl lg:rounded-3xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Заказ #{selectedOrder.id}
                                    </h2>
                                    <p className="text-sm text-zinc-500">Клиент ID: {selectedOrder.user_id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex border-b border-zinc-800">
                                {[
                                    { id: 'info', label: 'Инфо' },
                                    { id: 'chat', label: 'Чат' },
                                    { id: 'actions', label: 'Действия' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setOrderModalTab(tab.id as typeof orderModalTab)}
                                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                            orderModalTab === tab.id
                                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                                : 'text-zinc-500 hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Modal Content */}
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {/* INFO TAB */}
                                {orderModalTab === 'info' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-zinc-800/50 rounded-xl">
                                                <div className="text-xs text-zinc-500 mb-1">Статус</div>
                                                <div className="text-lg font-bold text-emerald-400">
                                                    {ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-zinc-800/50 rounded-xl">
                                                <div className="text-xs text-zinc-500 mb-1">Прогресс</div>
                                                <div className="text-lg font-bold text-white">{selectedOrder.progress || 0}%</div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-zinc-800/50 rounded-xl">
                                            <div className="text-xs text-zinc-500 mb-1">Предмет</div>
                                            <div className="text-white">{selectedOrder.subject || 'Не указан'}</div>
                                        </div>

                                        {/* Price Breakdown */}
                                        <div className="p-4 bg-zinc-800/50 rounded-xl space-y-2">
                                            <div className="text-xs text-zinc-500 mb-2">Стоимость</div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-400">Базовая цена:</span>
                                                <span className="text-white">{selectedOrder.price?.toLocaleString('ru-RU')} ₽</span>
                                            </div>
                                            {selectedOrder.promo_code && (
                                                <div className="flex justify-between text-purple-400">
                                                    <span>🎟️ {selectedOrder.promo_code}:</span>
                                                    <span>-{selectedOrder.promo_discount || 0}%</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between pt-2 border-t border-zinc-700">
                                                <span className="font-bold text-white">Итого:</span>
                                                <span className="font-bold text-emerald-400">
                                                    {(selectedOrder.final_price || selectedOrder.price || 0).toLocaleString('ru-RU')} ₽
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">Оплачено:</span>
                                                <span className="text-emerald-400">
                                                    {(selectedOrder.paid_amount || 0).toLocaleString('ru-RU')} ₽
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-zinc-800/50 rounded-xl">
                                            <div className="text-xs text-zinc-500 mb-1">Дедлайн</div>
                                            <div className="text-white">{selectedOrder.deadline || 'Без срока'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* CHAT TAB */}
                                {orderModalTab === 'chat' && (
                                    <div className="space-y-4">
                                        <div className="h-64 bg-zinc-800/50 rounded-xl p-3 overflow-y-auto">
                                            {chatLoading ? (
                                                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                                                    Загрузка сообщений...
                                                </div>
                                            ) : chatMessages.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                                                    Нет сообщений
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {chatMessages.map((msg, idx) => (
                                                        <div
                                                            key={msg.id || idx}
                                                            className={`p-3 rounded-xl text-sm ${
                                                                msg.sender_type === 'admin'
                                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 ml-8'
                                                                    : 'bg-zinc-700/50 mr-8'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center mb-1 text-xs">
                                                                <span className={msg.sender_type === 'admin' ? 'text-emerald-400' : 'text-zinc-400'}>
                                                                    {msg.sender_type === 'admin' ? 'Админ' : 'Клиент'}
                                                                </span>
                                                                <span className="text-zinc-600">
                                                                    {new Date(msg.created_at).toLocaleString('ru-RU')}
                                                                </span>
                                                            </div>
                                                            <div className="text-white">{msg.message_text}</div>
                                                            {msg.file_url && (
                                                                <a
                                                                    href={msg.file_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-400 underline text-xs mt-1 block"
                                                                >
                                                                    📎 Прикрепленный файл
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                value={messageInput}
                                                onChange={e => setMessageInput(e.target.value)}
                                                placeholder="Сообщение клиенту..."
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <Button onClick={handleSendMessage} className="bg-emerald-600 hover:bg-emerald-500">
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* ACTIONS TAB */}
                                {orderModalTab === 'actions' && (
                                    <div className="space-y-4">
                                        {/* Payment Verification */}
                                        {selectedOrder.status === 'verification_pending' && (
                                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-3">
                                                <h3 className="font-bold text-purple-400 flex items-center gap-2">
                                                    <Activity className="w-4 h-4" />
                                                    Проверка оплаты
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => handleConfirmPayment(false)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        50%
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleConfirmPayment(true)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        100%
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    <input
                                                        value={rejectReason}
                                                        onChange={e => setRejectReason(e.target.value)}
                                                        placeholder="Причина отклонения..."
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                                                    />
                                                    <Button
                                                        onClick={handleRejectPayment}
                                                        variant="outline"
                                                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Отклонить
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* File Upload */}
                                        {['in_progress', 'paid', 'paid_full'].includes(selectedOrder.status) && (
                                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl space-y-3">
                                                <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                                                    <FileUp className="w-4 h-4" />
                                                    Загрузка файлов
                                                </h3>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileSelect}
                                                    multiple
                                                    className="hidden"
                                                />
                                                <Button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    variant="outline"
                                                    className="w-full border-cyan-500/50 text-cyan-400"
                                                >
                                                    Выбрать файлы
                                                </Button>
                                                {selectedFiles.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs text-cyan-300">
                                                            {selectedFiles.map(f => f.name).join(', ')}
                                                        </div>
                                                        {isUploading && (
                                                            <div className="w-full bg-zinc-800 rounded h-2">
                                                                <div
                                                                    className="bg-cyan-500 h-2 rounded transition-all"
                                                                    style={{ width: `${uploadProgress}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                        <Button
                                                            onClick={handleFileUpload}
                                                            disabled={isUploading}
                                                            className="w-full bg-cyan-600 hover:bg-cyan-500"
                                                        >
                                                            {isUploading ? `${uploadProgress}%...` : 'Загрузить'}
                                                        </Button>
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={handleMarkDelivered}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                                                >
                                                    <Truck className="w-4 h-4 mr-1" />
                                                    Отправить клиенту
                                                </Button>
                                            </div>
                                        )}

                                        {/* Set Price */}
                                        <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Установить цену
                                            </h3>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={priceInput}
                                                    onChange={e => setPriceInput(e.target.value)}
                                                    placeholder="1500"
                                                    className="w-32 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                                                />
                                                <Button onClick={handleSetPrice} className="bg-amber-600 hover:bg-amber-500">
                                                    Установить
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Set Progress */}
                                        <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                Прогресс
                                            </h3>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={progressInput}
                                                    onChange={e => setProgressInput(e.target.value)}
                                                    placeholder="50"
                                                    max={100}
                                                    className="w-24 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                                                />
                                                <Button onClick={handleSetProgress} className="bg-blue-600 hover:bg-blue-500">
                                                    Обновить %
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Status Change */}
                                        <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                                            <h3 className="font-bold text-white">Изменить статус</h3>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                                    className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                                                >
                                                    <span>
                                                        {ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {statusDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl max-h-60 overflow-y-auto"
                                                        >
                                                            {ORDER_STATUSES.map(status => (
                                                                <button
                                                                    key={status.value}
                                                                    onClick={() => handleSetStatus(status.value)}
                                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-colors ${
                                                                        selectedOrder.status === status.value
                                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                                            : 'text-zinc-300'
                                                                    }`}
                                                                >
                                                                    {status.label}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Keyboard Shortcuts Help Modal */}
            <ShortcutsHelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                shortcuts={shortcuts}
            />

            {/* Client Profile Modal */}
            <ClientProfileModal
                isOpen={clientProfileOpen}
                userId={selectedClientId}
                onClose={() => {
                    setClientProfileOpen(false)
                    setSelectedClientId(null)
                }}
            />
        </div>
    )
}

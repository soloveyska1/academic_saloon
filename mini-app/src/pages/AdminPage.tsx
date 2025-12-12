import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
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
import {
    Lock, Terminal, Users, Activity, DollarSign,
    FileText, Send, XCircle, CheckCircle, X, Upload, Truck,
    Clock, CreditCard, AlertTriangle, Package, ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

// All available order statuses
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

// Access code should be validated on the server in production
// This is a client-side gate for quick access; actual permissions are server-enforced
const ACCESS_CODE_HASH = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'admin2024'

export const AdminPage: React.FC = () => {
    // Hooks
    const { trigger } = useHapticFeedback()
    const { userData } = useUserData()
    const navigate = useNavigate()

    // State
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [accessCode, setAccessCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'users' | 'sql'>('dashboard')

    // Data State
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [users, setUsers] = useState<AdminUser[]>([])
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 5')
    const [sqlResult, setSqlResult] = useState<AdminSqlResponse | null>(null)

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [orderModalTab, setOrderModalTab] = useState<'info' | 'chat' | 'actions'>('info')

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

    // Status dropdown
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

    // Auto-login logic REMOVED for security/drama as requested
    // useEffect(() => { ... }, [])

    const handleLogin = () => {
        if (accessCode === ACCESS_CODE_HASH) {
            handleLoginSuccess()
        } else {
            trigger('failure')
            setError('ДОСТУП ЗАПРЕЩЕН')
            setTimeout(() => setError(null), 2000)
            setAccessCode('')
        }
    }

    const handleLoginSuccess = () => {
        trigger('success')
        setIsAuthenticated(true)
        loadData()
    }

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
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSqlExecute = async () => {
        setIsLoading(true)
        try {
            const res = await executeAdminSql(sqlQuery)
            setSqlResult(res)
            trigger('touch')
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ошибка выполнения запроса'
            setSqlResult({ error: errorMessage })
            trigger('failure')
        } finally {
            setIsLoading(false)
        }
    }

    // ORDER ACTIONS
    const handleSetPrice = async () => {
        if (!selectedOrder || !priceInput) return
        try {
            await updateAdminOrderPrice(selectedOrder.id, parseFloat(priceInput))
            trigger('success')
            alert('Цена установлена!')
            setPriceInput('')
            loadData() // Refresh
        } catch {
            alert('Ошибка установки цены')
        }
    }

    const handleSendMessage = async () => {
        if (!selectedOrder || !messageInput) return
        try {
            await sendAdminMessage(selectedOrder.id, messageInput)
            trigger('success')
            setMessageInput('')
            alert('Сообщение отправлено')
            // In real app, we would append to local chat list
        } catch {
            alert('Ошибка отправки сообщения')
        }
    }

    const handleSetStatus = async (status: string) => {
        if (!selectedOrder) return
        try {
            await updateAdminOrderStatus(selectedOrder.id, status)
            trigger('success')
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: status as Order['status'] } : null)
        } catch {
            alert('Ошибка изменения статуса')
        }
    }

    const handleSetProgress = async () => {
        if (!selectedOrder || !progressInput) return
        try {
            await updateAdminOrderProgress(selectedOrder.id, parseInt(progressInput))
            trigger('success')
            alert('Прогресс обновлен')
        } catch {
            alert('Ошибка обновления прогресса')
        }
    }

    // Load chat messages when opening chat tab
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

    // Load chat when switching to chat tab
    useEffect(() => {
        if (selectedOrder && orderModalTab === 'chat') {
            loadChatMessages(selectedOrder.id)
        }
    }, [selectedOrder, orderModalTab, loadChatMessages])

    // PAYMENT ACTIONS
    const handleConfirmPayment = async (isFull: boolean) => {
        if (!selectedOrder) return
        try {
            await confirmGodPayment(selectedOrder.id, undefined, isFull)
            trigger('success')
            alert(isFull ? 'Полная оплата подтверждена!' : 'Предоплата подтверждена!')
            loadData()
            setSelectedOrder(prev => prev ? {
                ...prev,
                status: isFull ? 'paid_full' : 'paid',
                paid_amount: isFull ? prev.final_price : Math.ceil((prev.final_price || 0) / 2)
            } : null)
        } catch {
            alert('Ошибка подтверждения оплаты')
        }
    }

    const handleRejectPayment = async () => {
        if (!selectedOrder) return
        try {
            await rejectGodPayment(selectedOrder.id, rejectReason || 'Платеж не найден')
            trigger('failure')
            alert('Оплата отклонена')
            setRejectReason('')
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: 'waiting_payment' } : null)
        } catch {
            alert('Ошибка отклонения оплаты')
        }
    }

    // FILE UPLOAD
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
            alert('Файлы успешно загружены!')
            setSelectedFiles([])
            setUploadProgress(0)
            loadData()
        } catch {
            alert('Ошибка загрузки файлов')
        } finally {
            setIsUploading(false)
        }
    }

    // MARK AS DELIVERED
    const handleMarkDelivered = async () => {
        if (!selectedOrder) return
        try {
            await updateAdminOrderStatus(selectedOrder.id, 'review')
            trigger('success')
            alert('Заказ отправлен клиенту на проверку!')
            loadData()
            setSelectedOrder(prev => prev ? { ...prev, status: 'review' } : null)
        } catch {
            alert('Ошибка отправки заказа')
        }
    }

    // ══════════════════════════════════════════════════════════════
    // RENDERERS
    // ══════════════════════════════════════════════════════════════

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-50">
                <div className="matrix-bg absolute inset-0 opacity-20 pointer-events-none" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm space-y-8 relative z-10"
                >
                    <div className="text-center space-y-2">
                        <Lock className="w-16 h-16 text-green-500 mx-auto animate-pulse" />
                        <h1 className="text-3xl font-mono text-green-500 font-bold tracking-tighter">
                            СИСТЕМА ЗАЩИТЫ
                        </h1>
                        <p className="text-green-500/60 font-mono text-sm">
                            ВВЕДИТЕ КОД ДОСТУПА
                        </p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="password"
                            className="w-full bg-black border-2 border-green-500/50 rounded p-4 text-center text-green-500 font-mono text-2xl focus:outline-none focus:border-green-400 focus:shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all placeholder-green-900"
                            placeholder="•••"
                            value={accessCode}
                            onChange={e => setAccessCode(e.target.value)}
                        />

                        <Button
                            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold font-mono py-6 text-lg hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] transition-all"
                            onClick={handleLogin}
                        >
                            <Terminal className="w-5 h-5 mr-2" />
                            ВОЙТИ В СИСТЕМУ
                        </Button>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 font-mono text-center font-bold bg-red-900/20 p-2 rounded border border-red-500/50"
                            >
                                {error}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono pb-20 p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-green-500/30 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                    <h1 className="text-xl font-bold tracking-widest text-green-400">ADMIN_PANEL_V2.0</h1>
                </div>
                <div className="text-xs text-green-500/50">
                    ID: {userData?.telegram_id}
                </div>
                <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-400 text-xs"
                    onClick={() => { setIsAuthenticated(false); navigate('/') }}
                >
                    EXIT
                </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                    { id: 'dashboard', icon: Activity, label: 'ГЛАВНАЯ' },
                    { id: 'orders', icon: FileText, label: 'ЗАКАЗЫ' },
                    { id: 'users', icon: Users, label: 'ЛЮДИ' },
                    { id: 'sql', icon: Terminal, label: 'SQL' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as typeof activeTab); trigger('selection') }}
                        className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${activeTab === tab.id
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'bg-black border-green-900/50 text-green-700 hover:border-green-700'
                            }`}
                    >
                        <tab.icon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ERROR / LOADING */}
            {error && <div className="bg-red-900/30 text-red-400 p-4 mb-4 rounded border border-red-500/50">{error}</div>}
            {isLoading && <div className="text-center py-4 text-green-500/50 animate-pulse">ЗАГРУЗКА ДАННЫХ...</div>}

            {/* CONTENT */}
            <div className="space-y-6">

                {/* 1. DASHBOARD */}
                {activeTab === 'dashboard' && stats && (
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-black border border-green-500/50 p-4">
                            <div className="text-green-500/50 text-xs uppercase mb-1">Выручка</div>
                            <div className="text-2xl font-bold text-green-400">{stats.revenue?.toLocaleString()} ₽</div>
                        </Card>
                        <Card className="bg-black border border-green-500/50 p-4">
                            <div className="text-green-500/50 text-xs uppercase mb-1">Активные заказы</div>
                            <div className="text-2xl font-bold text-green-400">{stats.active_orders_count}</div>
                        </Card>
                        <Card className="bg-black border border-green-500/50 p-4 col-span-2">
                            <div className="text-green-500/50 text-xs uppercase mb-1">Всего пользователей</div>
                            <div className="text-2xl font-bold text-green-400 flex items-center justify-between">
                                {stats.total_users_count}
                                <Users className="w-5 h-5 opacity-50" />
                            </div>
                        </Card>
                    </div>
                )}

                {/* 2. ORDERS LIST */}
                {activeTab === 'orders' && (
                    <div className="space-y-3">
                        {orders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => { setSelectedOrder(order); trigger('selection') }}
                                className="bg-black border border-green-900 p-4 rounded hover:border-green-500 transition-colors cursor-pointer relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${['pending', 'waiting_estimation', 'draft'].includes(order.status) ? 'bg-red-500' :
                                            ['waiting_payment', 'confirmed'].includes(order.status) ? 'bg-yellow-500' :
                                                ['in_progress', 'paid', 'paid_full'].includes(order.status) ? 'bg-blue-500' :
                                                    'bg-green-500'
                                            }`} />
                                        <span className="font-bold text-green-400">#{order.id}</span>
                                    </div>
                                    <span className="text-[10px] bg-green-900/30 px-2 py-1 rounded text-green-300">
                                        {order.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 mb-1">{order.subject || 'Без предмета'}</div>
                                <div className="flex justify-between items-center text-xs text-green-500/60 font-mono">
                                    <span>{new Date(order.created_at || Date.now()).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2">
                                        {order.promo_code && (
                                            <span className="text-purple-400 text-[10px]">🎟️ {order.promo_code}</span>
                                        )}
                                        {order.promo_code && order.price !== order.final_price && (
                                            <span className="line-through text-gray-500">{order.price}</span>
                                        )}
                                        <span className={order.promo_code ? 'text-green-400 font-bold' : ''}>
                                            {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
                                        </span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. USERS LIST */}
                {activeTab === 'users' && (
                    <div className="space-y-2">
                        {users.map(u => (
                            <div key={u.internal_id} className="bg-black border border-green-900/50 p-3 rounded flex justify-between items-center text-xs">
                                <div>
                                    <div className="font-bold text-green-400">{u.fullname}</div>
                                    <div className="text-gray-500">@{u.username || 'no_user'} • {u.telegram_id}</div>
                                </div>
                                {u.is_admin && <span className="text-red-500 font-bold border border-red-500/50 px-1 rounded">ADMIN</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. SQL CONSOLE */}
                {activeTab === 'sql' && (
                    <div className="space-y-4">
                        <textarea
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            className="w-full h-32 bg-black border border-green-500/50 rounded p-3 font-mono text-xs text-green-400 focus:outline-none focus:border-green-400"
                            placeholder="SELECT * FROM users..."
                        />
                        <Button
                            onClick={handleSqlExecute}
                            className="w-full bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/50"
                        >
                            ВЫПОЛНИТЬ QUERY
                        </Button>

                        {sqlResult && (
                            <div className="mt-4 overflow-x-auto border border-green-900 rounded bg-black/50 p-2">
                                {sqlResult.error ? (
                                    <div className="text-red-500 text-xs font-mono whitespace-pre-wrap">{sqlResult.error}</div>
                                ) : (
                                    <table className="w-full text-[10px] font-mono text-left">
                                        <thead>
                                            <tr className="border-b border-green-900">
                                                {sqlResult.columns?.map(col => (
                                                    <th key={col} className="p-2 text-green-500/50">{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sqlResult.rows?.map((row, i) => (
                                                <tr key={i} className="border-b border-green-900/30">
                                                    {Object.values(row).map((val, j) => (
                                                        <td key={j} className="p-2 text-green-300 whitespace-nowrap overflow-hidden max-w-[150px] text-ellipsis">
                                                            {String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <div className="p-2 text-green-500/30 text-[9px]">
                                            Найдено строк: {sqlResult.rows?.length}
                                        </div>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ORDER DETAILS MODAL */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 bg-black z-50 flex flex-col pt-10"
                    >
                        <div className="flex-1 bg-black border-t border-green-500/50 p-4 overflow-y-auto pb-20">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                        ЗАКАЗ #{selectedOrder.id}
                                    </h2>
                                    <div className="text-xs text-green-500/50">ID Клиента: {selectedOrder.user_id}</div>
                                </div>
                                <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                                    <XCircle className="w-8 h-8 text-green-500" />
                                </Button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex border-b border-green-900 mb-6">
                                {['info', 'chat', 'actions'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setOrderModalTab(t as typeof orderModalTab)}
                                        className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${orderModalTab === t ? 'text-green-400 border-b-2 border-green-400' : 'text-green-800'
                                            }`}
                                    >
                                        {t === 'info' ? 'ИНФО' : t === 'chat' ? 'ЧАТ' : 'ДЕЙСТВИЯ'}
                                    </button>
                                ))}
                            </div>

                            {/* TAB: INFO */}
                            {orderModalTab === 'info' && (
                                <div className="space-y-6 font-mono text-sm">
                                    <div className="bg-green-900/10 p-4 rounded border border-green-900">
                                        <div className="text-green-500/50 text-xs mb-1">Предмет</div>
                                        <div className="text-white">{selectedOrder.subject || '—'}</div>
                                    </div>
                                    <div className="bg-green-900/10 p-4 rounded border border-green-900">
                                        <div className="text-green-500/50 text-xs mb-1">Статус</div>
                                        <div className="text-green-400 font-bold text-lg">{selectedOrder.status.toUpperCase()}</div>
                                    </div>

                                    {/* Price breakdown with promo */}
                                    <div className="bg-green-900/10 p-4 rounded border border-green-900 space-y-3">
                                        <div className="text-green-500/50 text-xs mb-1">💰 Цена заказа</div>

                                        {/* Original price */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-500/70">Базовая цена:</span>
                                            <span className="text-white">{selectedOrder.price?.toLocaleString('ru-RU')} ₽</span>
                                        </div>

                                        {/* Promo code if exists */}
                                        {selectedOrder.promo_code && (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-purple-400 flex items-center gap-1">
                                                        🎟️ Промокод: <span className="font-bold">{selectedOrder.promo_code}</span>
                                                    </span>
                                                    <span className="text-purple-400">-{selectedOrder.promo_discount || 0}%</span>
                                                </div>
                                                <div className="flex justify-between items-center text-purple-300 text-xs">
                                                    <span>Экономия:</span>
                                                    <span>-{Math.round(selectedOrder.price * (selectedOrder.promo_discount || 0) / 100).toLocaleString('ru-RU')} ₽</span>
                                                </div>
                                            </>
                                        )}

                                        {/* Loyalty discount if exists */}
                                        {(selectedOrder.discount || 0) > 0 && (
                                            <div className="flex justify-between items-center text-blue-400">
                                                <span>🎖️ Скидка лояльности:</span>
                                                <span>-{selectedOrder.discount}%</span>
                                            </div>
                                        )}

                                        {/* Bonuses if used */}
                                        {(selectedOrder.bonus_used || 0) > 0 && (
                                            <div className="flex justify-between items-center text-amber-400">
                                                <span>⭐ Бонусы:</span>
                                                <span>-{selectedOrder.bonus_used?.toLocaleString('ru-RU')} ₽</span>
                                            </div>
                                        )}

                                        {/* Final price */}
                                        <div className="border-t border-green-900 pt-2 mt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-400 font-bold">ИТОГО:</span>
                                                <span className="text-yellow-400 font-bold text-lg">
                                                    {(selectedOrder.final_price ?? selectedOrder.price)?.toLocaleString('ru-RU')} ₽
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-900/10 p-4 rounded border border-green-900">
                                            <div className="text-green-500/50 text-xs mb-1">Оплачено</div>
                                            <div className="text-green-400 font-bold">{selectedOrder.paid_amount?.toLocaleString('ru-RU')} ₽</div>
                                        </div>
                                        <div className="bg-green-900/10 p-4 rounded border border-green-900">
                                            <div className="text-green-500/50 text-xs mb-1">Остаток</div>
                                            <div className="text-orange-400 font-bold">
                                                {Math.max(0, (selectedOrder.final_price ?? selectedOrder.price) - (selectedOrder.paid_amount || 0))?.toLocaleString('ru-RU')} ₽
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-900/10 p-4 rounded border border-green-900">
                                        <div className="text-green-500/50 text-xs mb-1">Дедлайн</div>
                                        <div className="text-white">{selectedOrder.deadline || 'Без срока'}</div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: CHAT */}
                            {orderModalTab === 'chat' && (
                                <div className="space-y-4">
                                    {/* Chat messages */}
                                    <div className="h-64 bg-green-900/10 rounded p-3 border border-green-900 overflow-y-auto">
                                        {chatLoading ? (
                                            <div className="flex items-center justify-center h-full text-green-500/50 text-xs">
                                                ЗАГРУЗКА СООБЩЕНИЙ...
                                            </div>
                                        ) : chatMessages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-green-500/50 text-xs">
                                                НЕТ СООБЩЕНИЙ
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {chatMessages.map((msg, idx) => (
                                                    <div
                                                        key={msg.id || idx}
                                                        className={`p-2 rounded text-xs ${
                                                            msg.is_admin
                                                                ? 'bg-green-900/30 border border-green-500/30 ml-6'
                                                                : 'bg-gray-900/50 border border-gray-700/50 mr-6'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className={msg.is_admin ? 'text-green-400 font-bold' : 'text-gray-400'}>
                                                                {msg.is_admin ? '👨‍💼 АДМИН' : '👤 КЛИЕНТ'}
                                                            </span>
                                                            <span className="text-gray-600 text-[10px]">
                                                                {new Date(msg.created_at).toLocaleString('ru-RU')}
                                                            </span>
                                                        </div>
                                                        <div className="text-gray-300">{msg.text}</div>
                                                        {msg.file_url && (
                                                            <a
                                                                href={msg.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 underline text-[10px] mt-1 block"
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
                                            className="flex-1 bg-black border border-green-500/50 rounded px-3 py-2 text-sm text-green-400 focus:outline-none"
                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        />
                                        <Button onClick={handleSendMessage} size="icon" className="bg-green-600 text-black">
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* TAB: ACTIONS */}
                            {orderModalTab === 'actions' && (
                                <div className="space-y-6">

                                    {/* PAYMENT VERIFICATION - show when status is verification_pending */}
                                    {selectedOrder.status === 'verification_pending' && (
                                        <div className="p-4 border-2 border-purple-500/50 rounded bg-purple-900/20 space-y-3">
                                            <h3 className="font-bold text-purple-400 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" /> 💳 ПРОВЕРКА ОПЛАТЫ
                                            </h3>
                                            <div className="text-xs text-purple-300 mb-2">
                                                Клиент ожидает подтверждения оплаты. Проверьте поступление средств.
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    onClick={() => handleConfirmPayment(false)}
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    ПРЕДОПЛАТА 50%
                                                </Button>
                                                <Button
                                                    onClick={() => handleConfirmPayment(true)}
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-500 text-white font-bold"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    ПОЛНАЯ 100%
                                                </Button>
                                            </div>
                                            <div className="mt-3">
                                                <input
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    placeholder="Причина отклонения..."
                                                    className="w-full bg-black border border-red-500/30 rounded px-3 py-2 text-sm text-red-400 focus:outline-none mb-2"
                                                />
                                                <Button
                                                    onClick={handleRejectPayment}
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-red-500/50 text-red-400 hover:bg-red-900/20"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    ОТКЛОНИТЬ ОПЛАТУ
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* FILE UPLOAD / DELIVERY */}
                                    {['in_progress', 'paid', 'paid_full'].includes(selectedOrder.status) && (
                                        <div className="p-4 border border-cyan-500/50 rounded bg-cyan-900/10 space-y-3">
                                            <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> 📁 ЗАГРУЗКА ФАЙЛОВ
                                            </h3>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                multiple
                                                className="hidden"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-cyan-500/50 text-cyan-400"
                                                >
                                                    ВЫБРАТЬ ФАЙЛЫ
                                                </Button>
                                                {selectedFiles.length > 0 && (
                                                    <span className="text-xs text-cyan-300 self-center">
                                                        {selectedFiles.length} файл(ов)
                                                    </span>
                                                )}
                                            </div>
                                            {selectedFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] text-cyan-500/70">
                                                        {selectedFiles.map(f => f.name).join(', ')}
                                                    </div>
                                                    {isUploading && (
                                                        <div className="w-full bg-gray-800 rounded h-2">
                                                            <div
                                                                className="bg-cyan-500 h-2 rounded transition-all"
                                                                style={{ width: `${uploadProgress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                    <Button
                                                        onClick={handleFileUpload}
                                                        disabled={isUploading}
                                                        size="sm"
                                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold"
                                                    >
                                                        {isUploading ? `ЗАГРУЗКА ${uploadProgress}%...` : 'ЗАГРУЗИТЬ'}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Mark as delivered */}
                                            <div className="border-t border-cyan-900 pt-3 mt-3">
                                                <Button
                                                    onClick={handleMarkDelivered}
                                                    size="sm"
                                                    className="w-full bg-green-600 hover:bg-green-500 text-black font-bold"
                                                >
                                                    <Truck className="w-4 h-4 mr-1" />
                                                    ОТПРАВИТЬ КЛИЕНТУ
                                                </Button>
                                                <div className="text-[10px] text-green-500/50 mt-1">
                                                    Переводит заказ в статус "На проверке" и уведомляет клиента
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Set Price */}
                                    <div className="p-4 border border-green-900 rounded bg-green-900/5 space-y-3">
                                        <h3 className="font-bold text-green-400 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> ОЦЕНКА ЗАКАЗА
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={priceInput}
                                                onChange={e => setPriceInput(e.target.value)}
                                                placeholder="1500"
                                                className="w-24 bg-black border border-green-500/50 rounded px-2 text-center"
                                            />
                                            <Button onClick={handleSetPrice} size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                                                УСТАНОВИТЬ
                                            </Button>
                                        </div>
                                        <div className="text-[10px] text-green-500/50">
                                            Установка цены автоматически переведет статус в "Ожидает оплаты".
                                        </div>
                                    </div>

                                    {/* Set Progress */}
                                    <div className="p-4 border border-green-900 rounded bg-green-900/5 space-y-3">
                                        <h3 className="font-bold text-green-400 flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> ПРОГРЕСС
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={progressInput}
                                                onChange={e => setProgressInput(e.target.value)}
                                                placeholder="50"
                                                max={100}
                                                className="w-24 bg-black border border-green-500/50 rounded px-2 text-center"
                                            />
                                            <Button onClick={handleSetProgress} size="sm" className="bg-blue-600 hover:bg-blue-500 text-black font-bold">
                                                UPDATE %
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Status Dropdown - All statuses */}
                                    <div className="p-4 border border-green-900 rounded bg-green-900/5 space-y-3">
                                        <h3 className="font-bold text-green-400">РУЧНОЕ УПРАВЛЕНИЕ СТАТУСОМ</h3>
                                        <div className="relative">
                                            <button
                                                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                                className="w-full flex items-center justify-between bg-black border border-green-500/50 rounded px-3 py-2 text-sm text-green-400"
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
                                                        className="absolute z-50 w-full mt-1 bg-black border border-green-500/50 rounded max-h-60 overflow-y-auto"
                                                    >
                                                        {ORDER_STATUSES.map(status => (
                                                            <button
                                                                key={status.value}
                                                                onClick={() => {
                                                                    handleSetStatus(status.value)
                                                                    setStatusDropdownOpen(false)
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-green-900/30 border-b border-green-900/30 last:border-0 ${
                                                                    selectedOrder.status === status.value ? 'bg-green-900/50 text-green-300' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${status.color}-500`} />
                                                                {status.label}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <div className="text-[10px] text-green-500/50">
                                            Выберите статус из списка для ручного изменения
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

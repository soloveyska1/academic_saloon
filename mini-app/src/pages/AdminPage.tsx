import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Lock, Terminal, Activity,
    Users, DollarSign, AlertTriangle,
    ChevronRight, Power, Database, RefreshCw
} from 'lucide-react'
import { useUserData } from '../hooks/useUserData'
import { useSensoryFeedback } from '../hooks/useSensoryFeedback'
import {
    fetchAdminOrders, fetchAdminStats, fetchAdminUsers,
    executeAdminSql, updateAdminOrderStatus
} from '../api/userApi'
import { Order, AdminUser, AdminStats, AdminSqlResponse } from '../types'

// --- CONFIG ---
const ADMIN_ID = 872379852
const ACCESS_CODE = '777'
// --------------

export function AdminPage() {
    const navigate = useNavigate()
    const { userData } = useUserData()
    const { trigger } = useSensoryFeedback()

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [inputCode, setInputCode] = useState('')
    const [errorShake, setErrorShake] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    // Data State
    const [orders, setOrders] = useState<Order[]>([])
    const [stats, setStats] = useState<AdminStats>({ revenue: 0, active_orders_count: 0, total_users_count: 0 })
    const [users, setUsers] = useState<AdminUser[]>([])

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [showSql, setShowSql] = useState(false)
    const [showUsers, setShowUsers] = useState(false)

    // SQL State
    const [sqlQuery, setSqlQuery] = useState('')
    const [sqlResult, setSqlResult] = useState<AdminSqlResponse | null>(null)

    // Effects
    useEffect(() => {
        // Auto-login if Telegram ID matches
        if (userData?.telegram_id === ADMIN_ID) {
            handleLoginSuccess()
        }
    }, [userData])

    const handleLoginSuccess = () => {
        trigger('success')
        setIsLoading(true)
        setTimeout(() => {
            setIsAuthenticated(true)
            loadData()
            setIsLoading(false)
        }, 800)
    }

    const handleUnlock = () => {
        if (inputCode === ACCESS_CODE) {
            handleLoginSuccess()
        } else {
            trigger('failure')
            setErrorShake(prev => prev + 1)
            setInputCode('')
        }
    }

    const loadData = async () => {
        try {
            const [allOrders, adminStats, allUsers] = await Promise.all([
                fetchAdminOrders(),
                fetchAdminStats(),
                fetchAdminUsers()
            ])
            setOrders(allOrders)
            setStats(adminStats)
            setUsers(allUsers)
        } catch (e) {
            console.error('Failed to load admin data', e)
        }
    }

    const handleSqlExecute = async () => {
        if (!sqlQuery.trim()) return
        try {
            const res = await executeAdminSql(sqlQuery)
            setSqlResult(res)
        } catch (e) {
            setSqlResult({ columns: [], rows: [], error: String(e) })
        }
    }

    const changeOrderStatus = async (status: string) => {
        if (!selectedOrder) return
        try {
            await updateAdminOrderStatus(selectedOrder.id, status)
            trigger('success')
            loadData() // Refresh
            setSelectedOrder(prev => prev ? { ...prev, status: status as any } : null)
        } catch (e) {
            console.error('Update failed', e)
            trigger('failure')
        }
    }

    // --- MODAL RENDERERS ---
    const renderOrderModal = () => (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}
            />

            {/* Modal Content */}
            <motion.div
                layoutId={`order-${selectedOrder?.id}`}
                style={{
                    width: '100%', maxWidth: 400, background: '#0a0a0a',
                    border: '1px solid #0f0', borderRadius: 12, padding: 20,
                    maxHeight: '80vh', overflowY: 'auto', position: 'relative', zIndex: 10
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid rgba(0,255,0,0.2)', paddingBottom: 10 }}>
                    <span style={{ fontWeight: 'bold' }}>ORDER #{selectedOrder?.id}</span>
                    <span style={{ fontSize: 10, background: 'rgba(0,255,0,0.1)', padding: '2px 6px' }}>{selectedOrder?.status}</span>
                </div>

                <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                    <div style={{ opacity: 0.7 }}>SUBJECT</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedOrder?.subject} ({selectedOrder?.work_type_label})</div>

                    <div style={{ opacity: 0.7, marginTop: 10 }}>PRICE_INFO</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total: {selectedOrder?.final_price}₽</span>
                        <span>Paid: {selectedOrder?.paid_amount}₽</span>
                    </div>

                    <div style={{ opacity: 0.7, marginTop: 10 }}>TIMESTAMPS</div>
                    <div>Created: {new Date(selectedOrder?.created_at || '').toLocaleDateString()}</div>
                    <div>Deadline: {selectedOrder?.deadline || 'N/A'}</div>
                </div>

                <div style={{ marginTop: 24, display: 'grid', gap: 8 }}>
                    <button
                        onClick={() => changeOrderStatus('in_progress')}
                        style={{ padding: 12, border: '1px solid #0f0', background: 'rgba(0,255,0,0.1)', color: '#0f0', cursor: 'pointer' }}
                    >
                        SET STATUS: IN PROGRESS
                    </button>
                    <button
                        onClick={() => changeOrderStatus('completed')}
                        style={{ padding: 12, border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer' }}
                    >
                        SET STATUS: COMPLETED
                    </button>
                    <button
                        onClick={() => changeOrderStatus('cancelled')}
                        style={{ padding: 12, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}
                    >
                        TERMINATE ORDER
                    </button>
                </div>
            </motion.div>
        </div>
    )

    const renderSqlModal = () => (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowSql(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)' }}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ width: '100%', height: '70vh', background: '#000', border: '1px solid #3b82f6', padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div style={{ borderBottom: '1px solid #3b82f6', paddingBottom: 8, color: '#3b82f6', fontSize: 12, display: 'flex', gap: 8 }}>
                    <Database size={14} /> SQL_CONSOLE_V1.0
                </div>
                <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', paddingTop: 12, overflowY: 'auto' }}>
                    <p>&gt; CONNECTING TO DB_MAIN...</p>
                    <p>&gt; CONNECTION ESTABLISHED (14ms)</p>
                    <p>&gt; ACCESS LEVEL: ROOT</p>

                    {sqlResult && (
                        <div style={{ marginTop: 16, borderTop: '1px dashed #3b82f6', paddingTop: 8 }}>
                            {sqlResult.error ? (
                                <div style={{ color: 'red' }}>ERROR: {sqlResult.error}</div>
                            ) : (
                                <div>
                                    <div style={{ color: '#fff' }}>QUERY OK</div>
                                    <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8, fontSize: 10 }}>
                                        <thead>
                                            <tr>
                                                {sqlResult.columns.map((c, i) => (
                                                    <th key={i} style={{ border: '1px solid #3b82f6', padding: 4 }}>{c}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sqlResult.rows.map((row, i) => (
                                                <tr key={i}>
                                                    {row.map((val, j) => (
                                                        <td key={j} style={{ border: '1px solid #3b82f6', padding: 4, color: '#fff' }}>{val}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <p>&gt; _</p>
                </div>
                <div style={{ display: 'flex' }}>
                    <input
                        autoFocus
                        value={sqlQuery}
                        onChange={e => setSqlQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSqlExecute()}
                        placeholder="ENTER SQL QUERY..."
                        style={{ flex: 1, background: 'transparent', border: 'none', borderTop: '1px solid #333', color: '#fff', padding: 12, outline: 'none', fontFamily: 'monospace' }}
                    />
                    <button onClick={handleSqlExecute} style={{ background: '#3b82f6', color: '#000', border: 'none', fontWeight: 'bold', padding: '0 16px', cursor: 'pointer' }}>RUN</button>
                </div>
            </motion.div>
        </div>
    )

    const renderUsersModal = () => (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowUsers(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)' }}
            />
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{ width: '100%', maxHeight: '70vh', background: '#111', border: '1px solid #eab308', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div style={{ padding: 16, background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>USER DATABASE ({users.length})</span>
                    <Users size={18} />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {users.map((user) => (
                        <div key={user.internal_id} style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: '#fff', fontSize: 14 }}>{user.fullname}</div>
                                <div style={{ color: '#666', fontSize: 10 }}>@{user.username || 'N/A'} (ID: {user.telegram_id})</div>
                            </div>
                            <div style={{ color: user.is_admin ? '#eab308' : '#888', fontSize: 10 }}>
                                {user.is_admin ? 'ADMIN' : 'USER'}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    )

    // --- RENDER LOCK SCREEN ---
    if (!isAuthenticated) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: '#000',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 20
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)',
                    zIndex: 0
                }} />

                {/* Matrix Rain Effect */}
                <div className="matrix-bg" style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }} />

                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ zIndex: 1, marginBottom: 40 }}
                >
                    <div style={{
                        width: 80, height: 80, borderRadius: 24,
                        border: '1px solid rgba(0, 255, 0, 0.3)',
                        background: 'rgba(0, 20, 0, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(0, 255, 0, 0.2)'
                    }}>
                        <Lock size={40} color="#0f0" />
                    </div>
                </motion.div>

                <motion.div
                    key={errorShake}
                    initial={{ x: 0 }}
                    animate={{ x: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    style={{ width: '100%', maxWidth: 320, zIndex: 1 }}
                >
                    <div style={{
                        fontSize: 14, color: '#0f0', fontFamily: 'monospace',
                        marginBottom: 12, textAlign: 'center', letterSpacing: 2
                    }}>
                        ENTER ACCESS CODE
                    </div>

                    <input
                        type="password"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="_ _ _"
                        maxLength={6}
                        style={{
                            width: '100%',
                            background: 'rgba(0, 10, 0, 0.8)',
                            border: '1px solid #0f0',
                            color: '#0f0',
                            fontSize: 24,
                            fontFamily: 'monospace',
                            textAlign: 'center',
                            padding: '16px',
                            borderRadius: 12,
                            outline: 'none',
                            boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)'
                        }}
                    />

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleUnlock}
                        style={{
                            marginTop: 24,
                            width: '100%',
                            padding: 16,
                            background: '#0f0',
                            border: 'none',
                            borderRadius: 12,
                            color: '#000',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            fontSize: 16,
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(0, 255, 0, 0.4)'
                        }}
                    >
                        {isLoading ? 'DECRYPTING...' : 'AUTHENTICATE'}
                    </motion.button>
                </motion.div>

                <div style={{
                    position: 'absolute', bottom: 20,
                    color: 'rgba(0, 255, 0, 0.3)',
                    fontSize: 10, fontFamily: 'monospace'
                }}>
                    SYSTEM ID: {userData?.telegram_id || 'UNKNOWN'}
                </div>
            </div>
        )
    }

    // --- RENDER DASHBOARD ---
    return (
        <div style={{
            minHeight: '100vh',
            background: '#050505',
            color: '#0f0',
            fontFamily: 'monospace',
            paddingBottom: 40
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 20px',
                borderBottom: '1px solid rgba(0,255,0,0.2)',
                background: 'rgba(0,20,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 10,
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Terminal size={20} />
                    <span style={{ fontWeight: 'bold', letterSpacing: 1 }}>GOD_MODE_v2.0</span>
                </div>
                <button
                    onClick={() => {
                        setIsAuthenticated(false)
                        navigate('/')
                    }}
                    style={{ background: 'none', border: 'none', color: '#ff3333' }}
                >
                    <Power size={20} />
                </button>
            </div>

            {/* Stats Ticker */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
                background: 'rgba(0,255,0,0.2)', marginBottom: 20
            }}>
                {[
                    { label: 'REVENUE', val: `${stats.revenue.toLocaleString()}₽`, icon: DollarSign },
                    { label: 'ACTIVE', val: stats.active_orders_count, icon: Activity },
                    { label: 'USERS', val: stats.total_users_count, icon: Users },
                ].map((item, i) => (
                    <div key={i} style={{
                        background: '#0a0a0a', padding: '16px 8px',
                        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                        <item.icon size={16} style={{ marginBottom: 8, opacity: 0.7 }} />
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{item.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '0 16px' }}>

                {/* Actions Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <AdminActionCard icon={RefreshCw} label="REFRESH DATA" onClick={loadData} />
                    <AdminActionCard icon={Database} label="SQL CONSOLE" color="#3b82f6" onClick={() => setShowSql(true)} />
                    <AdminActionCard icon={Users} label="MANAGE USERS" color="#eab308" onClick={() => setShowUsers(true)} />
                    <AdminActionCard icon={AlertTriangle} label="EMERGENCY" color="#ef4444" />
                </div>

                {/* Orders List (Hacker Style) */}
                <div style={{ border: '1px solid rgba(0,255,0,0.2)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{
                        background: 'rgba(0,255,0,0.1)', padding: '12px 16px',
                        fontSize: 12, fontWeight: 'bold', borderBottom: '1px solid rgba(0,255,0,0.2)'
                    }}>
                        &gt; LAST ORDERS_LOG
                    </div>

                    {orders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(0,255,0,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'rgba(0,0,0,0.4)',
                                cursor: 'pointer'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: '#0f0', fontWeight: 'bold' }}>#{order.id}</span>
                                    <span style={{
                                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                        background: 'rgba(255,255,255,0.1)'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                                    {order.work_type_label} • {order.final_price}₽
                                </div>
                            </div>
                            <ChevronRight size={16} style={{ opacity: 0.5 }} />
                        </div>
                    ))}

                    {orders.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
                            NO DATA FOUND OR ACCESS RESTRICTED
                        </div>
                    )}
                </div>

            </div>

            {/* Modals */}
            <AnimatePresence>
                {selectedOrder && renderOrderModal()}
                {showSql && renderSqlModal()}
                {showUsers && renderUsersModal()}
            </AnimatePresence>
        </div>
    )
}

function AdminActionCard({ icon: Icon, label, onClick, color = '#0f0' }: any) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${color}40`,
                borderRadius: 12,
                padding: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8,
                cursor: 'pointer'
            }}
        >
            <Icon size={24} color={color} />
            <span style={{ color: color, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>{label}</span>
        </motion.button>
    )
}

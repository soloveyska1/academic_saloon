/**
 * GOD MODE - Full Admin Control Panel
 * ====================================
 * Access restricted to ADMIN_IDS only (verified via Telegram initData)
 * No passwords - pure Telegram authentication
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Activity, Users, Package, Tag, ScrollText, Terminal, Radio,
  TrendingUp, TrendingDown, DollarSign, Clock, Eye, EyeOff, Ban,
  MessageSquare, Check, X, RefreshCw, Search, Filter, ChevronRight,
  AlertTriangle, Send, Plus, Trash2, ToggleLeft, ToggleRight,
  Zap, Settings, Home, Shield, Bell, CreditCard, Percent
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'
import {
  fetchGodDashboard,
  fetchGodOrders,
  fetchGodUsers,
  fetchGodPromos,
  fetchGodLogs,
  fetchGodLiveActivity,
  updateGodOrderStatus,
  updateGodOrderPrice,
  updateGodOrderProgress,
  confirmGodPayment,
  rejectGodPayment,
  sendGodOrderMessage,
  modifyGodUserBalance,
  toggleGodUserBan,
  toggleGodUserWatch,
  updateGodUserNotes,
  createGodPromo,
  toggleGodPromo,
  deleteGodPromo,
  executeGodSql,
  sendGodBroadcast,
} from '../api/userApi'
import type { GodDashboard, GodOrder, GodUser, GodPromo, GodLog, GodLiveUser } from '../types'

// Status colors and labels
const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', emoji: '📝', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  pending: { label: 'Ожидает', emoji: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  waiting_estimation: { label: 'Оценка', emoji: '🔍', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  waiting_payment: { label: 'К оплате', emoji: '💵', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  verification_pending: { label: 'Проверка', emoji: '🔔', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  confirmed: { label: 'Подтверждён', emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  paid: { label: 'Аванс', emoji: '💳', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  paid_full: { label: 'Оплачен', emoji: '💰', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  in_progress: { label: 'В работе', emoji: '⚙️', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  review: { label: 'Готово', emoji: '🔍', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  revision: { label: 'Правки', emoji: '✏️', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  completed: { label: 'Завершён', emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled: { label: 'Отменён', emoji: '—', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  rejected: { label: 'Отклонён', emoji: '—', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

// Tabs configuration
type TabId = 'dashboard' | 'orders' | 'users' | 'promos' | 'live' | 'logs' | 'sql' | 'broadcast'
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: <Home size={18} /> },
  { id: 'orders', label: 'Заказы', icon: <Package size={18} /> },
  { id: 'users', label: 'Клиенты', icon: <Users size={18} /> },
  { id: 'promos', label: 'Промо', icon: <Tag size={18} /> },
  { id: 'live', label: 'Live', icon: <Radio size={18} /> },
  { id: 'logs', label: 'Логи', icon: <ScrollText size={18} /> },
  { id: 'sql', label: 'SQL', icon: <Terminal size={18} /> },
  { id: 'broadcast', label: 'Рассылка', icon: <Bell size={18} /> },
]

// Common styles
const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 16,
  padding: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'linear-gradient(180deg, #f5d485, #D4AF37)',
  border: 'none',
  borderRadius: 10,
  color: '#0a0a0c',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
}

export function GodModePage() {
  const { isAdmin } = useAdmin()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [loading, setLoading] = useState(true)

  // Access denied screen
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={40} color="#ef4444" />
        </motion.div>
        <h1 style={{ color: '#ef4444', fontSize: 24, margin: 0 }}>Access Denied</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 300 }}>
          You are not authorized to access God Mode.
          This incident will be reported.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,12,0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #D4AF37, #f5d485)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Crown size={24} color="#0a0a0c" />
          </div>
          <div>
            <h1 style={{ color: '#D4AF37', fontSize: 18, fontWeight: 700, margin: 0 }}>
              GOD MODE
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>
              Full Control Panel
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
      }}>
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === tab.id
                ? 'linear-gradient(180deg, #f5d485, #D4AF37)'
                : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.id ? '#0a0a0c' : 'rgba(255,255,255,0.6)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardTab key="dashboard" />}
          {activeTab === 'orders' && <OrdersTab key="orders" />}
          {activeTab === 'users' && <UsersTab key="users" />}
          {activeTab === 'promos' && <PromosTab key="promos" />}
          {activeTab === 'live' && <LiveTab key="live" />}
          {activeTab === 'logs' && <LogsTab key="logs" />}
          {activeTab === 'sql' && <SqlTab key="sql" />}
          {activeTab === 'broadcast' && <BroadcastTab key="broadcast" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab() {
  const [data, setData] = useState<GodDashboard | null>(null)
  const [pendingOrders, setPendingOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardResult, ordersResult] = await Promise.all([
        fetchGodDashboard(),
        fetchGodOrders({ status: 'verification_pending', limit: 10 })
      ])
      setData(dashboardResult)
      setPendingOrders(ordersResult.orders)

      // Play sound if new pending orders
      if (ordersResult.orders.length > 0 && pendingOrders.length < ordersResult.orders.length) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2ckIB0aGRqeIyeo52SgHBjYGd3jJ+pqJuKd2hkaHqOnqmomox4aGVofI+gqqmai3doZWl9kKGrq5qKeGhlanySoaurmop4aGVqfZKhq6yainhoZWp9kqGrrJqKeGhlbH6SoausmYp4aGZsfpOiq6yZinhpZm1/k6KsrJmJeGlmbYCToqysmon/');
          audio.volume = 0.3
          audio.play().catch(() => {})
        } catch {}
      }
    } catch (e) {
      console.error('Dashboard load error:', e)
    }
    setLoading(false)
  }, [pendingOrders.length])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // Auto-refresh every 15s
    return () => clearInterval(interval)
  }, [])

  const handleQuickConfirm = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await confirmGodPayment(orderId)
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      // Vibrate on success
      if (navigator.vibrate) navigator.vibrate(100)
    } catch (e) {
      console.error(e)
    }
    setActionLoading(null)
  }

  const handleQuickReject = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await rejectGodPayment(orderId, 'Платёж не найден')
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (e) {
      console.error(e)
    }
    setActionLoading(null)
  }

  if (loading && !data) {
    return <LoadingSpinner />
  }

  if (!data) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* QUICK ACTIONS - Pending Payments */}
      {pendingOrders.length > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05))',
            border: '2px solid rgba(236,72,153,0.4)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '12px 16px',
            background: 'rgba(236,72,153,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Bell size={20} color="#ec4899" />
            </motion.div>
            <span style={{ color: '#ec4899', fontWeight: 700, fontSize: 14 }}>
              Проверка оплаты ({pendingOrders.length})
            </span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingOrders.slice(0, 5).map(order => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{
                  padding: 12,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                    #{order.id} • {order.final_price.toLocaleString()}₽
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {order.user_fullname} • {order.work_type_label}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleQuickConfirm(order.id)}
                    disabled={actionLoading === order.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: actionLoading === order.id ? 0.5 : 1,
                    }}
                  >
                    <Check size={20} color="#fff" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleQuickReject(order.id)}
                    disabled={actionLoading === order.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: actionLoading === order.id ? 0.5 : 1,
                    }}
                  >
                    <X size={20} color="#fff" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Attention Alert */}
      {data.orders.needing_attention > 0 && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={24} color="#ef4444" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
              Требуют внимания: {data.orders.needing_attention}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              Pending, verification, estimation
            </div>
          </div>
        </motion.div>
      )}

      {/* Revenue Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <DollarSign size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Выручка</span>
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Сегодня" value={`${data.revenue.today.toLocaleString()}₽`} color="#22c55e" />
          <StatCard label="Неделя" value={`${data.revenue.week.toLocaleString()}₽`} color="#3b82f6" />
          <StatCard label="Месяц" value={`${data.revenue.month.toLocaleString()}₽`} color="#8b5cf6" />
          <StatCard label="Всего" value={`${data.revenue.total.toLocaleString()}₽`} color="#D4AF37" />
        </div>
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          Средний чек: {data.revenue.average_order.toLocaleString()}₽
        </div>
      </div>

      {/* Orders Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Package size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Заказы</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Активных" value={data.orders.active} color="#3b82f6" />
          <StatCard label="Сегодня" value={data.orders.today} color="#22c55e" />
          <StatCard label="Завершено сегодня" value={data.orders.completed_today} color="#8b5cf6" />
          <StatCard label="Всего" value={data.orders.total} color="#D4AF37" />
        </div>
      </div>

      {/* Users Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Users size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Пользователи</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Online" value={data.users.online} color="#22c55e" />
          <StatCard label="Сегодня" value={data.users.today} color="#3b82f6" />
          <StatCard label="За неделю" value={data.users.week} color="#8b5cf6" />
          <StatCard label="Всего" value={data.users.total} color="#D4AF37" />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          <span>Забанено: {data.users.banned}</span>
          <span>Под наблюдением: {data.users.watched}</span>
        </div>
        <div style={{ marginTop: 8, color: 'rgba(212,175,55,0.6)', fontSize: 12 }}>
          Общий баланс бонусов: {data.users.total_bonus_balance.toLocaleString()}₽
        </div>
      </div>

      {/* Orders by Status */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>По статусам</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(data.orders.by_status)
            .filter(([_, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { label: status, emoji: '📋', color: '#fff', bg: 'rgba(255,255,255,0.1)' }
              return (
                <div key={status} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: cfg.bg,
                  borderRadius: 8,
                }}>
                  <span>{cfg.emoji}</span>
                  <span style={{ color: cfg.color, fontWeight: 500, flex: 1 }}>{cfg.label}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: 12,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 10,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function OrdersTab() {
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<GodOrder | null>(null)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodOrders({ status: statusFilter, search, limit: 100 })
      setOrders(result.orders)
      setTotal(result.total)
    } catch (e) {
      console.error('Orders load error:', e)
    }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="ID или тема..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 100 }}
        >
          <option value="all">Все</option>
          <option value="pending">Ожидает</option>
          <option value="verification_pending">Проверка</option>
          <option value="waiting_payment">К оплате</option>
          <option value="in_progress">В работе</option>
          <option value="review">Готово</option>
          <option value="completed">Завершён</option>
        </select>
      </div>

      {/* Results count */}
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        Найдено: {total}
      </div>

      {/* Orders List */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => setSelectedOrder(order)}
            />
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function OrderCard({ order, onClick }: { order: GodOrder; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...cardStyle,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          padding: '4px 10px',
          background: cfg.bg,
          color: cfg.color,
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {cfg.emoji} {cfg.label}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>#{order.id}</span>
        <span style={{ marginLeft: 'auto', color: '#D4AF37', fontWeight: 700 }}>{order.price.toLocaleString()}₽</span>
      </div>
      <div style={{ color: '#fff', fontWeight: 500 }}>{order.work_type_label}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        {order.subject || 'Без предмета'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          {order.user_fullname} {order.user_username ? `@${order.user_username}` : ''}
        </span>
        {order.progress > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <div style={{
              width: 60,
              height: 4,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${order.progress}%`,
                height: '100%',
                background: '#D4AF37',
              }} />
            </div>
            <span style={{ color: '#D4AF37', fontSize: 11 }}>{order.progress}%</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function OrderDetailModal({ order, onClose, onUpdate }: { order: GodOrder; onClose: () => void; onUpdate: () => void }) {
  const [status, setStatus] = useState(order.status)
  const [price, setPrice] = useState(order.price.toString())
  const [progress, setProgress] = useState(order.progress.toString())
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const handleStatusChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderStatus(order.id, status)
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handlePriceChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderPrice(order.id, parseFloat(price))
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleProgressChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderProgress(order.id, parseInt(progress))
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleConfirmPayment = async () => {
    setSaving(true)
    try {
      await confirmGodPayment(order.id)
      onUpdate()
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleRejectPayment = async () => {
    setSaving(true)
    try {
      await rejectGodPayment(order.id, 'Платёж не найден')
      onUpdate()
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    setSaving(true)
    try {
      await sendGodOrderMessage(order.id, message)
      setMessage('')
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: '24px 24px 0 0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{
            padding: '6px 14px',
            background: cfg.bg,
            color: cfg.color,
            borderRadius: 8,
            fontWeight: 600,
          }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Заказ #{order.id}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Order Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            {order.work_type_label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            {order.subject} • {order.topic || 'Тема не указана'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>
            Клиент: {order.user_fullname} (ID: {order.user_telegram_id})
          </div>
        </div>

        {/* Quick Actions for Verification Pending */}
        {order.status === 'verification_pending' && (
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 20,
            padding: 16,
            background: 'rgba(236,72,153,0.1)',
            borderRadius: 12,
          }}>
            <button
              onClick={handleConfirmPayment}
              disabled={saving}
              style={{ ...buttonStyle, flex: 1, background: 'linear-gradient(180deg, #22c55e, #16a34a)' }}
            >
              <Check size={18} /> Подтвердить
            </button>
            <button
              onClick={handleRejectPayment}
              disabled={saving}
              style={{ ...buttonStyle, flex: 1, background: 'linear-gradient(180deg, #ef4444, #dc2626)' }}
            >
              <X size={18} /> Отклонить
            </button>
          </div>
        )}

        {/* Status Change */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Статус
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <button
              onClick={handleStatusChange}
              disabled={saving || status === order.status}
              style={buttonStyle}
            >
              <Check size={16} />
            </button>
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Цена (текущая: {order.price.toLocaleString()}₽, оплачено: {order.paid_amount.toLocaleString()}₽)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handlePriceChange}
              disabled={saving}
              style={buttonStyle}
            >
              <CreditCard size={16} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Прогресс: {progress}%
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleProgressChange}
              disabled={saving}
              style={buttonStyle}
            >
              <Percent size={16} />
            </button>
          </div>
        </div>

        {/* Send Message */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Сообщение клиенту
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите сообщение..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleSendMessage}
              disabled={saving || !message.trim()}
              style={buttonStyle}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  USERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function UsersTab() {
  const [users, setUsers] = useState<GodUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedUser, setSelectedUser] = useState<GodUser | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodUsers({ search, filter_type: filterType, limit: 100 })
      setUsers(result.users)
    } catch (e) {
      console.error('Users load error:', e)
    }
    setLoading(false)
  }, [search, filterType])

  useEffect(() => {
    load()
  }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="ID, username, имя..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 100 }}
        >
          <option value="">Все</option>
          <option value="banned">Забанены</option>
          <option value="watched">Наблюдение</option>
          <option value="with_balance">С балансом</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(user => (
            <UserCard
              key={user.telegram_id}
              user={user}
              onClick={() => setSelectedUser(user)}
            />
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function UserCard({ user, onClick }: { user: GodUser; onClick: () => void }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...cardStyle,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}>
        {user.rank_emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{user.fullname || 'Без имени'}</span>
          {user.is_banned && <Ban size={14} color="#ef4444" />}
          {user.is_watched && <Eye size={14} color="#f59e0b" />}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#D4AF37', fontWeight: 700 }}>{user.balance.toLocaleString()}₽</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{user.orders_count} заказов</div>
      </div>
    </motion.div>
  )
}

function UserDetailModal({ user, onClose, onUpdate }: { user: GodUser; onClose: () => void; onUpdate: () => void }) {
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [banReason, setBanReason] = useState('')
  const [notes, setNotes] = useState(user.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const handleBalance = async (add: boolean) => {
    if (!balanceAmount) return
    setSaving(true)
    try {
      const amount = add ? parseFloat(balanceAmount) : -parseFloat(balanceAmount)
      await modifyGodUserBalance(user.telegram_id, amount, balanceReason || 'Admin adjustment', true)
      setBalanceAmount('')
      setBalanceReason('')
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleBan = async () => {
    setSaving(true)
    try {
      await toggleGodUserBan(user.telegram_id, !user.is_banned, banReason)
      onUpdate()
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleWatch = async () => {
    setSaving(true)
    try {
      await toggleGodUserWatch(user.telegram_id, !user.is_watched)
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateGodUserNotes(user.telegram_id, notes)
      onUpdate()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: '24px 24px 0 0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 32 }}>{user.rank_emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{user.fullname || 'Без имени'}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              @{user.username || 'none'} • ID: {user.telegram_id}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18 }}>{user.balance.toLocaleString()}₽</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Баланс</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{user.orders_count}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Заказов</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{user.total_spent.toLocaleString()}₽</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Потрачено</div>
          </div>
        </div>

        {/* Balance Management */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Изменить баланс
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="Сумма"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => handleBalance(true)}
              disabled={saving || !balanceAmount}
              style={{ ...buttonStyle, background: 'linear-gradient(180deg, #22c55e, #16a34a)' }}
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => handleBalance(false)}
              disabled={saving || !balanceAmount}
              style={{ ...buttonStyle, background: 'linear-gradient(180deg, #ef4444, #dc2626)' }}
            >
              <TrendingDown size={16} />
            </button>
          </div>
          <input
            type="text"
            value={balanceReason}
            onChange={(e) => setBalanceReason(e.target.value)}
            placeholder="Причина (опционально)"
            style={inputStyle}
          />
        </div>

        {/* Ban / Watch */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleBan}
            disabled={saving}
            style={{
              ...buttonStyle,
              flex: 1,
              background: user.is_banned
                ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                : 'linear-gradient(180deg, #ef4444, #dc2626)',
            }}
          >
            {user.is_banned ? <Check size={16} /> : <Ban size={16} />}
            {user.is_banned ? 'Разбанить' : 'Забанить'}
          </button>
          <button
            onClick={handleWatch}
            disabled={saving}
            style={{
              ...secondaryButtonStyle,
              flex: 1,
              background: user.is_watched ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {user.is_watched ? <EyeOff size={16} /> : <Eye size={16} />}
            {user.is_watched ? 'Снять' : 'Следить'}
          </button>
        </div>

        {/* Notes */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Заметки админа
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Заметки о пользователе..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            style={{ ...buttonStyle, marginTop: 8, width: '100%', justifyContent: 'center' }}
          >
            Сохранить заметки
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROMOS TAB
// ═══════════════════════════════════════════════════════════════════════════

function PromosTab() {
  const [promos, setPromos] = useState<GodPromo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newMaxUses, setNewMaxUses] = useState('0')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodPromos()
      setPromos(result.promos)
    } catch (e) {
      console.error('Promos load error:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (!newCode.trim()) return
    try {
      await createGodPromo({
        code: newCode,
        discount_percent: parseFloat(newDiscount),
        max_uses: parseInt(newMaxUses),
      })
      setNewCode('')
      setShowCreate(false)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await toggleGodPromo(id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить промокод?')) return
    try {
      await deleteGodPromo(id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Create button */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        style={buttonStyle}
      >
        <Plus size={18} /> Создать промокод
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ ...cardStyle, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Код (напр. SALE20)"
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="number"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  placeholder="Скидка %"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="Макс. исп. (0=безлимит)"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              <button onClick={handleCreate} style={buttonStyle}>
                <Check size={18} /> Создать
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promos list */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {promos.map(promo => (
            <div key={promo.id} style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: promo.is_active ? 1 : 0.5,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: 16 }}>{promo.code}</span>
                  <span style={{
                    padding: '2px 8px',
                    background: promo.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)',
                    color: promo.is_active ? '#22c55e' : '#6b7280',
                    borderRadius: 4,
                    fontSize: 11,
                  }}>
                    {promo.is_active ? 'Активен' : 'Выкл'}
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  -{promo.discount_percent}% • Исп: {promo.current_uses}/{promo.max_uses || '∞'}
                </div>
              </div>
              <button
                onClick={() => handleToggle(promo.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {promo.is_active
                  ? <ToggleRight size={28} color="#22c55e" />
                  : <ToggleLeft size={28} color="#6b7280" />
                }
              </button>
              <button
                onClick={() => handleDelete(promo.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={20} color="#ef4444" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE TAB
// ═══════════════════════════════════════════════════════════════════════════

function LiveTab() {
  const [data, setData] = useState<{ online_count: number; users: GodLiveUser[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const result = await fetchGodLiveActivity()
      setData(result)
    } catch (e) {
      console.error('Live load error:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [load])

  if (loading && !data) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Online count */}
      <div style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
        border: '1px solid rgba(34,197,94,0.3)',
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#22c55e',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>
          {data?.online_count || 0}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>пользователей онлайн</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {/* Users list */}
      {data?.users.map(user => (
        <div key={user.telegram_id} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 500 }}>
                {user.fullname || 'Unknown'} {user.username ? `@${user.username}` : ''}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {user.current_page || 'Unknown page'}
                {user.current_order_id && ` • Заказ #${user.current_order_id}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                {user.session_duration_min} мин
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                {user.platform}
              </div>
            </div>
          </div>
        </div>
      ))}

      {data?.users.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
          Никого нет онлайн
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOGS TAB
// ═══════════════════════════════════════════════════════════════════════════

function LogsTab() {
  const [logs, setLogs] = useState<GodLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodLogs({ limit: 100 })
      setLogs(result.logs)
    } catch (e) {
      console.error('Logs load error:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Последние 100 действий</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {logs.map(log => (
        <div key={log.id} style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          borderLeft: '3px solid rgba(212,175,55,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{log.action_emoji}</span>
            <span style={{ color: '#fff', fontWeight: 500, fontSize: 13 }}>{log.action_type}</span>
            {log.target_type && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                • {log.target_type} #{log.target_id}
              </span>
            )}
          </div>
          {log.details && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
              {log.details}
            </div>
          )}
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            {log.admin_username || `Admin ${log.admin_id}`} • {new Date(log.created_at!).toLocaleString('ru')}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SQL TAB
// ═══════════════════════════════════════════════════════════════════════════

function SqlTab() {
  const [query, setQuery] = useState('SELECT id, fullname, balance FROM users ORDER BY balance DESC LIMIT 10')
  const [result, setResult] = useState<{ columns: string[]; rows: string[][]; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = async () => {
    setLoading(true)
    try {
      const res = await executeGodSql(query)
      setResult(res)
    } catch (e: any) {
      setResult({ columns: [], rows: [], error: e.message })
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Warning */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <AlertTriangle size={18} color="#f59e0b" />
        <span style={{ color: '#f59e0b', fontSize: 12 }}>
          Только SELECT запросы. Модификация через API endpoints.
        </span>
      </div>

      {/* Query input */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10"
        rows={4}
        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
      />

      <button onClick={execute} disabled={loading} style={buttonStyle}>
        <Zap size={18} /> {loading ? 'Выполняю...' : 'Выполнить'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ ...cardStyle, overflow: 'auto' }}>
          {result.error ? (
            <div style={{ color: '#ef4444' }}>Error: {result.error}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={i} style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: '1px solid rgba(212,175,55,0.2)',
                      color: '#D4AF37',
                      fontWeight: 600,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.7)',
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  BROADCAST TAB
// ═══════════════════════════════════════════════════════════════════════════

function BroadcastTab() {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'all' | 'active' | 'with_orders'>('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const send = async () => {
    if (!text.trim()) return
    if (!confirm(`Отправить рассылку ${target}?`)) return

    setSending(true)
    try {
      const res = await sendGodBroadcast(text, target)
      setResult({ sent: res.sent, failed: res.failed })
      setText('')
    } catch (e) {
      console.error(e)
    }
    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Warning */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <AlertTriangle size={18} color="#ef4444" />
        <span style={{ color: '#ef4444', fontSize: 12 }}>
          Осторожно! Сообщение будет отправлено всем выбранным пользователям.
        </span>
      </div>

      {/* Target selection */}
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
          Получатели
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as any)}
          style={inputStyle}
        >
          <option value="all">Все пользователи</option>
          <option value="active">Активные (7 дней)</option>
          <option value="with_orders">С заказами</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
          Сообщение (поддерживает HTML)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="<b>Заголовок</b>\n\nТекст сообщения..."
          rows={6}
          style={inputStyle}
        />
      </div>

      {/* Send */}
      <button
        onClick={send}
        disabled={sending || !text.trim()}
        style={{
          ...buttonStyle,
          background: 'linear-gradient(180deg, #ef4444, #dc2626)',
          justifyContent: 'center',
        }}
      >
        <Send size={18} /> {sending ? 'Отправка...' : 'Отправить рассылку'}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          ...cardStyle,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ color: '#22c55e', fontWeight: 600 }}>
            Отправлено: {result.sent}
          </div>
          {result.failed > 0 && (
            <div style={{ color: '#ef4444', fontSize: 12 }}>
              Ошибок: {result.failed}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <RefreshCw size={24} color="#D4AF37" />
      </motion.div>
    </div>
  )
}

export default GodModePage

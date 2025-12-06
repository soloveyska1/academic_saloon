import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  MessageSquare,
  TrendingUp,
  Activity,
  Eye,
  Send,
  Ban,
  Check,
  MoreVertical,
  ArrowLeft,
  Zap,
  Bell,
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'
import { API_BASE_URL, getAuthHeaders } from '../api/userApi'
import { Order, OrderStatus } from '../types'

// Admin order with extended info
interface AdminOrder extends Order {
  client_telegram_id: number
  client_username: string | null
  client_fullname: string
  unread_messages: number
}

// Log entry type
interface LogEntry {
  id: number
  timestamp: string
  action: string
  user_id: number | null
  username: string | null
  order_id: number | null
  details: string
  level: 'info' | 'warning' | 'error' | 'success'
}

// Stats type
interface AdminStats {
  total_orders: number
  pending_orders: number
  in_progress_orders: number
  completed_today: number
  revenue_today: number
  active_users: number
}

// Status config
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Черновик', color: '#71717a', icon: FileText },
  pending: { label: 'Новый', color: '#f59e0b', icon: Bell },
  waiting_estimation: { label: 'Ждёт оценки', color: '#f59e0b', icon: Clock },
  waiting_payment: { label: 'Ждёт оплаты', color: '#eab308', icon: DollarSign },
  verification_pending: { label: 'Проверка оплаты', color: '#8b5cf6', icon: Eye },
  confirmed: { label: 'Подтверждён', color: '#22c55e', icon: Check },
  paid: { label: 'Оплачен', color: '#22c55e', icon: DollarSign },
  paid_full: { label: 'Оплачен полностью', color: '#22c55e', icon: DollarSign },
  in_progress: { label: 'В работе', color: '#3b82f6', icon: Play },
  review: { label: 'На проверке', color: '#a855f7', icon: Eye },
  revision: { label: 'На доработке', color: '#f97316', icon: RefreshCw },
  completed: { label: 'Завершён', color: '#22c55e', icon: CheckCircle },
  cancelled: { label: 'Отменён', color: '#ef4444', icon: XCircle },
  rejected: { label: 'Отклонён', color: '#ef4444', icon: Ban },
}

// Quick action buttons based on status
const getQuickActions = (status: OrderStatus): { action: string; label: string; icon: React.ElementType; color: string }[] => {
  switch (status) {
    case 'pending':
    case 'waiting_estimation':
      return [
        { action: 'set_price', label: 'Установить цену', icon: DollarSign, color: '#22c55e' },
        { action: 'reject', label: 'Отклонить', icon: XCircle, color: '#ef4444' },
      ]
    case 'verification_pending':
      return [
        { action: 'confirm_payment', label: 'Подтвердить оплату', icon: Check, color: '#22c55e' },
        { action: 'reject_payment', label: 'Отклонить оплату', icon: XCircle, color: '#ef4444' },
      ]
    case 'paid':
    case 'paid_full':
    case 'confirmed':
      return [
        { action: 'start_work', label: 'Взять в работу', icon: Play, color: '#3b82f6' },
      ]
    case 'in_progress':
      return [
        { action: 'send_for_review', label: 'Отправить на проверку', icon: Send, color: '#a855f7' },
        { action: 'update_progress', label: 'Обновить прогресс', icon: TrendingUp, color: '#3b82f6' },
      ]
    case 'review':
      return [
        { action: 'complete', label: 'Завершить', icon: CheckCircle, color: '#22c55e' },
        { action: 'revision', label: 'На доработку', icon: RefreshCw, color: '#f97316' },
      ]
    case 'revision':
      return [
        { action: 'send_for_review', label: 'Отправить на проверку', icon: Send, color: '#a855f7' },
      ]
    default:
      return []
  }
}

export function AdminDashboardPage() {
  const admin = useAdmin()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'orders' | 'logs'>('orders')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Expanded order for details
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  // Action modal
  const [actionModal, setActionModal] = useState<{
    orderId: number
    action: string
    label: string
  } | null>(null)
  const [actionInput, setActionInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch orders
      const ordersRes = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: getAuthHeaders(),
      })

      if (!ordersRes.ok) {
        if (ordersRes.status === 403) {
          throw new Error('Доступ запрещён. Вы не администратор.')
        }
        throw new Error('Ошибка загрузки данных')
      }

      const ordersData = await ordersRes.json()
      setOrders(ordersData.orders || [])
      setStats(ordersData.stats || null)

      // Fetch logs
      const logsRes = await fetch(`${API_BASE_URL}/admin/logs`, {
        headers: getAuthHeaders(),
      })

      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData.logs || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchAdminData()

    // Poll every 10 seconds
    const interval = setInterval(fetchAdminData, 10000)
    return () => clearInterval(interval)
  }, [fetchAdminData])

  // Execute order action
  const executeAction = async (orderId: number, action: string, data?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Ошибка выполнения действия')
      }

      // Refresh data
      await fetchAdminData()
      setActionModal(null)
      setActionInput('')

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        order.id.toString().includes(q) ||
        order.subject.toLowerCase().includes(q) ||
        order.client_username?.toLowerCase().includes(q) ||
        order.client_fullname.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Check admin access
  if (!admin.isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: 300,
        }}>
          <Shield size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f2f2f2', marginBottom: 8 }}>Доступ запрещён</h2>
          <p style={{ color: '#71717a', fontSize: 14 }}>
            У вас нет прав администратора
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #d4af37, #8b6914)',
              border: 'none',
              borderRadius: 12,
              color: '#0a0a0c',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(10,10,12,0.98) 0%, rgba(10,10,12,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        padding: '16px 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} color="#a1a1aa" />
            </button>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Shield size={20} color="#d4af37" />
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f2f2f2',
                }}>
                  ADMIN PANEL
                </span>
              </div>
              <div style={{
                fontSize: 11,
                color: '#71717a',
                marginTop: 2,
              }}>
                Управление заказами и логи
              </div>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <RefreshCw
              size={18}
              color="#3b82f6"
              style={{
                animation: loading ? 'spin 1s linear infinite' : 'none'
              }}
            />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 16,
          }}>
            <div style={{
              padding: '12px 10px',
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>
                {stats.pending_orders}
              </div>
              <div style={{ fontSize: 10, color: '#71717a' }}>Новых</div>
            </div>
            <div style={{
              padding: '12px 10px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                {stats.in_progress_orders}
              </div>
              <div style={{ fontSize: 10, color: '#71717a' }}>В работе</div>
            </div>
            <div style={{
              padding: '12px 10px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
                {stats.completed_today}
              </div>
              <div style={{ fontSize: 10, color: '#71717a' }}>Сегодня</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'orders'
                ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeTab === 'orders' ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Package size={16} color={activeTab === 'orders' ? '#d4af37' : '#71717a'} />
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'orders' ? '#d4af37' : '#71717a',
            }}>
              Заказы
            </span>
            {orders.filter(o => ['pending', 'waiting_estimation', 'verification_pending'].includes(o.status)).length > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 8,
              }}>
                {orders.filter(o => ['pending', 'waiting_estimation', 'verification_pending'].includes(o.status)).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'logs'
                ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeTab === 'logs' ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Activity size={16} color={activeTab === 'logs' ? '#a855f7' : '#71717a'} />
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'logs' ? '#a855f7' : '#71717a',
            }}>
              Логи
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px' }}>
        {error && (
          <div style={{
            padding: 16,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
          </div>
        )}

        {activeTab === 'orders' && (
          <>
            {/* Search & Filters */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                }}>
                  <Search size={16} color="#71717a" />
                  <input
                    type="text"
                    placeholder="Поиск по ID, теме, клиенту..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#f2f2f2',
                      fontSize: 14,
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: showFilters
                      ? 'rgba(212,175,55,0.1)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${showFilters ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Filter size={18} color={showFilters ? '#d4af37' : '#71717a'} />
                </button>
              </div>

              {/* Status Filter Pills */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingBottom: 8,
                    }}>
                      <button
                        onClick={() => setStatusFilter('all')}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: statusFilter === 'all'
                            ? 'rgba(212,175,55,0.2)'
                            : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${statusFilter === 'all' ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 20,
                          color: statusFilter === 'all' ? '#d4af37' : '#71717a',
                          cursor: 'pointer',
                        }}
                      >
                        Все
                      </button>
                      {(['pending', 'waiting_estimation', 'verification_pending', 'in_progress', 'review', 'revision', 'completed'] as OrderStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            background: statusFilter === status
                              ? `${STATUS_CONFIG[status].color}20`
                              : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${statusFilter === status ? `${STATUS_CONFIG[status].color}40` : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 20,
                            color: statusFilter === status ? STATUS_CONFIG[status].color : '#71717a',
                            cursor: 'pointer',
                          }}
                        >
                          {STATUS_CONFIG[status].label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Orders List */}
            {loading && orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#71717a' }}>
                Загрузка...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#71717a' }}>
                Заказов не найдено
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredOrders.map(order => {
                  const statusConfig = STATUS_CONFIG[order.status]
                  const StatusIcon = statusConfig.icon
                  const quickActions = getQuickActions(order.status)
                  const isExpanded = expandedOrder === order.id

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Order Header */}
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        style={{
                          width: '100%',
                          padding: 16,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4,
                            }}>
                              <span style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#f2f2f2',
                              }}>
                                #{order.id}
                              </span>
                              <span style={{
                                padding: '3px 8px',
                                fontSize: 10,
                                fontWeight: 600,
                                background: `${statusConfig.color}20`,
                                color: statusConfig.color,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                <StatusIcon size={10} />
                                {statusConfig.label}
                              </span>
                              {order.unread_messages > 0 && (
                                <span style={{
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: '#ef4444',
                                  color: '#fff',
                                  borderRadius: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}>
                                  <MessageSquare size={10} />
                                  {order.unread_messages}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 13,
                              color: '#a1a1aa',
                            }}>
                              {order.work_type_label} • {order.subject}
                            </div>
                          </div>
                          <ChevronDown
                            size={18}
                            color="#71717a"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: 12,
                          color: '#71717a',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={12} />
                            {order.client_username ? `@${order.client_username}` : order.client_fullname}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <DollarSign size={12} />
                            {order.final_price.toLocaleString()}₽
                          </span>
                          {order.deadline && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} />
                              {order.deadline}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0 16px 16px',
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                              paddingTop: 16,
                            }}>
                              {/* Progress bar for in_progress */}
                              {order.status === 'in_progress' && (
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                    fontSize: 12,
                                    color: '#a1a1aa',
                                  }}>
                                    <span>Прогресс</span>
                                    <span>{order.progress}%</span>
                                  </div>
                                  <div style={{
                                    height: 6,
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                  }}>
                                    <div style={{
                                      width: `${order.progress}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                      borderRadius: 3,
                                    }} />
                                  </div>
                                </div>
                              )}

                              {/* Order details */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                                marginBottom: 16,
                                fontSize: 12,
                              }}>
                                <div style={{
                                  padding: 10,
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: 8,
                                }}>
                                  <div style={{ color: '#71717a', marginBottom: 4 }}>Telegram ID</div>
                                  <div style={{ color: '#f2f2f2', fontWeight: 600 }}>
                                    {order.client_telegram_id}
                                  </div>
                                </div>
                                <div style={{
                                  padding: 10,
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: 8,
                                }}>
                                  <div style={{ color: '#71717a', marginBottom: 4 }}>Оплачено</div>
                                  <div style={{ color: '#22c55e', fontWeight: 600 }}>
                                    {order.paid_amount.toLocaleString()}₽ / {order.final_price.toLocaleString()}₽
                                  </div>
                                </div>
                                <div style={{
                                  padding: 10,
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: 8,
                                }}>
                                  <div style={{ color: '#71717a', marginBottom: 4 }}>Схема оплаты</div>
                                  <div style={{ color: '#f2f2f2', fontWeight: 600 }}>
                                    {order.payment_scheme === 'full' ? 'Полная' : order.payment_scheme === 'half' ? '50/50' : '—'}
                                  </div>
                                </div>
                                <div style={{
                                  padding: 10,
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: 8,
                                }}>
                                  <div style={{ color: '#71717a', marginBottom: 4 }}>Создан</div>
                                  <div style={{ color: '#f2f2f2', fontWeight: 600 }}>
                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              {quickActions.length > 0 && (
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 8,
                                }}>
                                  {quickActions.map(qa => {
                                    const ActionIcon = qa.icon
                                    return (
                                      <button
                                        key={qa.action}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (['set_price', 'update_progress'].includes(qa.action)) {
                                            setActionModal({ orderId: order.id, action: qa.action, label: qa.label })
                                          } else {
                                            executeAction(order.id, qa.action)
                                          }
                                        }}
                                        style={{
                                          padding: '8px 14px',
                                          fontSize: 12,
                                          fontWeight: 600,
                                          background: `${qa.color}15`,
                                          border: `1px solid ${qa.color}30`,
                                          borderRadius: 10,
                                          color: qa.color,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                        }}
                                      >
                                        <ActionIcon size={14} />
                                        {qa.label}
                                      </button>
                                    )
                                  })}

                                  {/* View chat button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/order/${order.id}`)
                                    }}
                                    style={{
                                      padding: '8px 14px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 10,
                                      color: '#a1a1aa',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    <Eye size={14} />
                                    Открыть
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#71717a' }}>
                {loading ? 'Загрузка логов...' : 'Логов пока нет'}
              </div>
            ) : (
              logs.map(log => {
                const levelColors = {
                  info: '#3b82f6',
                  warning: '#f59e0b',
                  error: '#ef4444',
                  success: '#22c55e',
                }
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      borderLeft: `3px solid ${levelColors[log.level]}`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: levelColors[log.level],
                      }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: 11, color: '#71717a' }}>
                        {new Date(log.timestamp).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: '#a1a1aa',
                      marginBottom: 4,
                    }}>
                      {log.details}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      fontSize: 11,
                      color: '#71717a',
                    }}>
                      {log.username && <span>@{log.username}</span>}
                      {log.order_id && <span>Заказ #{log.order_id}</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              zIndex: 1000,
            }}
            onClick={() => setActionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 340,
                background: 'linear-gradient(180deg, #1a1a1d 0%, #0a0a0c 100%)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 20,
                padding: 24,
              }}
            >
              <h3 style={{
                color: '#f2f2f2',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}>
                {actionModal.label}
              </h3>
              <p style={{
                color: '#71717a',
                fontSize: 14,
                marginBottom: 20,
              }}>
                Заказ #{actionModal.orderId}
              </p>

              <input
                type={actionModal.action === 'set_price' ? 'number' : 'text'}
                placeholder={actionModal.action === 'set_price' ? 'Цена в рублях' : 'Прогресс (0-100)'}
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: '#f2f2f2',
                  fontSize: 16,
                  marginBottom: 20,
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setActionModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#a1a1aa',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    const data = actionModal.action === 'set_price'
                      ? { price: Number(actionInput) }
                      : { progress: Number(actionInput) }
                    executeAction(actionModal.orderId, actionModal.action, data)
                  }}
                  disabled={!actionInput || actionLoading}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #d4af37, #8b6914)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#0a0a0c',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: !actionInput || actionLoading ? 0.5 : 1,
                  }}
                >
                  {actionLoading ? 'Загрузка...' : 'Применить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

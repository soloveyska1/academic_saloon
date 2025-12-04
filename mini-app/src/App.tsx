import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { RoulettePage } from './pages/RoulettePage'
import { ProfilePage } from './pages/ProfilePage'
import { CreateOrderPage } from './pages/CreateOrderPage'
import { ReferralPage } from './pages/ReferralPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { SupportPage } from './pages/SupportPage'
import { Navigation } from './components/Navigation'
import { LoadingScreen } from './components/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GoldParticles } from './components/ui/GoldParticles'
import { ToastProvider } from './components/ui/Toast'
import { FloatingMenu } from './components/ui/FloatingMenu'
import { AdminProvider } from './contexts/AdminContext'
import { AdminPanel } from './components/AdminPanel'
import { useUserData } from './hooks/useUserData'
import {
  WebSocketProvider,
  OrderUpdateMessage,
  BalanceUpdateMessage,
  NotificationMessage,
  RefreshMessage,
} from './hooks/useWebSocket'
import {
  OrderStatusNotification,
  BalanceNotification,
  RealtimeNotification,
  RealtimeNotificationData,
} from './components/ui/RealtimeNotification'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

// Notification state types
interface OrderNotificationState {
  orderId: number
  status: string
}

interface BalanceNotificationState {
  change: number
  newBalance: number
  reason: string
}

function AppContent() {
  const { userData, loading, error, refetch } = useUserData()
  const [isReady, setIsReady] = useState(false)

  // Realtime notification states
  const [orderNotification, setOrderNotification] = useState<OrderNotificationState | null>(null)
  const [balanceNotification, setBalanceNotification] = useState<BalanceNotificationState | null>(null)
  const [generalNotification, setGeneralNotification] = useState<RealtimeNotificationData | null>(null)

  // WebSocket handlers
  const handleOrderUpdate = useCallback((msg: OrderUpdateMessage) => {
    console.log('[App] Order update received:', msg)
    setOrderNotification({
      orderId: msg.order_id,
      status: msg.status,
    })
    // Refresh data to get latest order status
    refetch()
  }, [refetch])

  const handleBalanceUpdate = useCallback((msg: BalanceUpdateMessage) => {
    console.log('[App] Balance update received:', msg)
    setBalanceNotification({
      change: msg.change,
      newBalance: msg.balance,
      reason: msg.reason,
    })
    // Refresh data to get latest balance
    refetch()
  }, [refetch])

  const handleNotification = useCallback((msg: NotificationMessage) => {
    console.log('[App] Notification received:', msg)
    setGeneralNotification({
      id: Date.now().toString(),
      type: msg.notification_type as 'info' | 'success' | 'warning' | 'error',
      title: msg.title,
      message: msg.message,
      timestamp: new Date(),
    })
  }, [])

  const handleRefresh = useCallback((msg: RefreshMessage) => {
    console.log('[App] Refresh requested:', msg.refresh_type)
    refetch()
  }, [refetch])

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  if (!isReady || loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 20,
      }}>
        <div style={{
          width: 70,
          height: 70,
          borderRadius: 18,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={36} color="#ef4444" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#f2f2f2',
            margin: 0,
            marginBottom: 10,
          }}>
            Ошибка загрузки
          </h2>
          <p style={{
            fontSize: 14,
            color: '#71717a',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 280,
          }}>
            {error}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: '#050505',
            background: 'linear-gradient(180deg, #f5d061, #d4af37)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={18} />
          Попробовать снова
        </button>
      </div>
    )
  }

  // Get telegram ID for WebSocket
  const telegramId = userData?.telegram_id || null

  return (
    <ErrorBoundary>
      <AdminProvider>
        <ToastProvider>
          <WebSocketProvider
            telegramId={telegramId}
            onOrderUpdate={handleOrderUpdate}
            onBalanceUpdate={handleBalanceUpdate}
            onNotification={handleNotification}
            onRefresh={handleRefresh}
          >
            <BrowserRouter>
              <div className="app">
                {/* Animated Gold Particles Background */}
                <GoldParticles />

                {/* Realtime Notifications */}
                <AnimatePresence>
                  {orderNotification && (
                    <OrderStatusNotification
                      orderId={orderNotification.orderId}
                      status={orderNotification.status}
                      onDismiss={() => setOrderNotification(null)}
                      onClick={() => {
                        setOrderNotification(null)
                        window.location.href = `/order/${orderNotification.orderId}`
                      }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {balanceNotification && (
                    <BalanceNotification
                      change={balanceNotification.change}
                      newBalance={balanceNotification.newBalance}
                      reason={balanceNotification.reason}
                      onDismiss={() => setBalanceNotification(null)}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {generalNotification && (
                    <RealtimeNotification
                      notification={generalNotification}
                      onDismiss={() => setGeneralNotification(null)}
                    />
                  )}
                </AnimatePresence>

                <Routes>
                  <Route path="/" element={<HomePage user={userData} />} />
                  <Route path="/orders" element={<OrdersPage orders={userData?.orders || []} />} />
                  <Route path="/order/:id" element={<OrderDetailPage />} />
                  <Route path="/roulette" element={<RoulettePage user={userData} />} />
                  <Route path="/profile" element={<ProfilePage user={userData} />} />
                  <Route path="/create-order" element={<CreateOrderPage />} />
                  <Route path="/referral" element={<ReferralPage user={userData} />} />
                  <Route path="/achievements" element={<AchievementsPage user={userData} />} />
                  <Route path="/support" element={<SupportPage />} />
                </Routes>
                <Navigation />
                {/* Floating Action Menu */}
                <FloatingMenu
                  onNewOrder={() => window.location.href = '/create-order'}
                  onBonus={() => window.location.href = '/roulette'}
                />
                {/* Admin Debug Panel */}
                <AdminPanel />
              </div>
            </BrowserRouter>
          </WebSocketProvider>
        </ToastProvider>
      </AdminProvider>
    </ErrorBoundary>
  )
}

// Main App wrapper
function App() {
  return <AppContent />
}

export default App

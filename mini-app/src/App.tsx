import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { LoadingScreen } from './components/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GoldParticles } from './components/ui/GoldParticles'
import { ToastProvider } from './components/ui/Toast'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AdminPanel } from './components/AdminPanel'
import { useUserData } from './hooks/useUserData'
import { LuxuryLoader } from './components/ui/LuxuryLoader'
import {
  WebSocketProvider,
  OrderUpdateMessage,
  BalanceUpdateMessage,
  ProgressUpdateMessage,
  NotificationMessage,
  RefreshMessage,
  useWebSocketContext,
} from './hooks/useWebSocket'
import {
  SmartNotification,
  SmartNotificationData,
} from './components/ui/RealtimeNotification'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'

// Lazy Load Pages
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(module => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then(module => ({ default: module.OrderDetailPage })))
const RoulettePage = lazy(() => import('./pages/RoulettePage').then(module => ({ default: module.RoulettePage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })))
const CreateOrderPage = lazy(() => import('./pages/CreateOrderPage').then(module => ({ default: module.CreateOrderPage })))
const ReferralPage = lazy(() => import('./pages/ReferralPage').then(module => ({ default: module.ReferralPage })))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(module => ({ default: module.AchievementsPage })))
const SupportPage = lazy(() => import('./pages/SupportPage').then(module => ({ default: module.SupportPage })))

// WebSocket connection status indicator (only shown in debug mode)
function WSStatusIndicator({ showDebug }: { showDebug: boolean }) {
  const { isConnected, reconnect } = useWebSocketContext()

  // Only show when debug mode is enabled
  if (!showDebug) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 10px) + 10px)',
        left: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isConnected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: 20,
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
      }}
      onClick={() => !isConnected && reconnect()}
    >
      {isConnected ? (
        <Wifi size={14} color="#22c55e" />
      ) : (
        <WifiOff size={14} color="#ef4444" />
      )}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: isConnected ? '#22c55e' : '#ef4444',
      }}>
        {isConnected ? 'WS' : 'Offline'}
      </span>
    </motion.div>
  )
}

// Wrapper to pass admin context to WSStatusIndicator
function AdminAwareWSIndicator() {
  const admin = useAdmin()
  return <WSStatusIndicator showDebug={admin.showDebugInfo} />
}

function AppContent() {
  const { userData, error, refetch } = useUserData()
  const [isReady, setIsReady] = useState(false)

  // Smart notification state - handles all notification types
  const [notification, setNotification] = useState<SmartNotificationData | null>(null)

  // WebSocket handlers - now unified for smart notifications
  const handleOrderUpdate = useCallback((msg: OrderUpdateMessage) => {
    console.log('[App] Order update received:', msg)

    // Smart notification data comes directly from server
    // Merge order_id into data for navigation action
    const mergedData = {
      ...(msg.data || {}),
      order_id: msg.order_id,
    }

    const smartData: SmartNotificationData = {
      type: 'order_update',
      order_id: msg.order_id,
      status: msg.status,
      title: (msg as any).title || 'Обновление заказа',
      message: (msg as any).message || `Статус: ${msg.status}`,
      icon: (msg as any).icon || 'package',
      color: (msg as any).color || '#d4af37',
      priority: (msg as any).priority || 'normal',
      action: (msg as any).action || 'view_order', // Default action to view order
      celebration: (msg as any).celebration,
      confetti: (msg as any).confetti,
      data: mergedData,
    }

    setNotification(smartData)
    refetch()
  }, [refetch])

  const handleBalanceUpdate = useCallback((msg: BalanceUpdateMessage) => {
    console.log('[App] Balance update received:', msg)

    const smartData: SmartNotificationData = {
      type: 'balance_update',
      title: (msg as any).title || (msg.change > 0 ? 'Баланс пополнен' : 'Списание'),
      message: (msg as any).message || msg.reason,
      icon: (msg as any).icon || (msg.change > 0 ? 'trending-up' : 'trending-down'),
      color: (msg as any).color || (msg.change > 0 ? '#22c55e' : '#ef4444'),
      balance: msg.balance,
      change: msg.change,
      celebration: (msg as any).celebration,
    }

    setNotification(smartData)
    refetch()
  }, [refetch])

  const handleNotification = useCallback((msg: NotificationMessage) => {
    console.log('[App] Notification received:', msg)

    const smartData: SmartNotificationData = {
      type: 'notification',
      notification_type: msg.notification_type,
      title: msg.title,
      message: msg.message,
      icon: (msg as any).icon || 'bell',
      color: (msg as any).color || '#d4af37',
    }

    setNotification(smartData)
  }, [])

  // Handle progress updates
  const handleProgressUpdate = useCallback((msg: ProgressUpdateMessage) => {
    console.log('[App] Progress update received:', msg)

    const smartData: SmartNotificationData = {
      type: 'progress_update',
      order_id: msg.order_id,
      title: msg.title || `Прогресс: ${msg.progress}%`,
      message: msg.message || '',
      icon: 'trending-up',
      color: '#3b82f6',
      progress: msg.progress,
      action: 'view_order',
      data: { order_id: msg.order_id },
    }

    setNotification(smartData)
    refetch()
  }, [refetch])

  const handleRefresh = useCallback((msg: RefreshMessage) => {
    console.log('[App] Refresh requested:', msg.refresh_type)
    refetch()
  }, [refetch])

  // Handle notification action (e.g., navigate to order)
  const handleNotificationAction = useCallback((action: string, data: Record<string, unknown>) => {
    console.log('[App] Notification action:', action, 'data:', data)
    if (action === 'view_order') {
      const orderId = data.order_id || data.orderId
      if (orderId) {
        // Navigate to order page
        window.location.href = `/order/${orderId}`
      } else {
        console.warn('[App] No order_id in notification data')
      }
    }
  }, [])

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Get telegram ID for WebSocket - need it before loading check
  const telegramId = userData?.telegram_id || null

  // Show loading only on initial load, NOT during refetch
  // Use isReady as the only initial load flag
  if (!isReady) {
    return <LoadingScreen />
  }

  // Error state - but still allow notifications
  if (error && !userData) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <WebSocketProvider
            telegramId={telegramId}
            onOrderUpdate={handleOrderUpdate}
            onBalanceUpdate={handleBalanceUpdate}
            onProgressUpdate={handleProgressUpdate}
            onNotification={handleNotification}
            onRefresh={handleRefresh}
          >
            {/* Always show notifications even on error screen */}
            <SmartNotification
              notification={notification}
              onDismiss={() => setNotification(null)}
              onAction={handleNotificationAction}
            />
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
          </WebSocketProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AdminProvider>
          <ToastProvider>
            <WebSocketProvider
              telegramId={telegramId}
              onOrderUpdate={handleOrderUpdate}
              onBalanceUpdate={handleBalanceUpdate}
              onProgressUpdate={handleProgressUpdate}
              onNotification={handleNotification}
              onRefresh={handleRefresh}
            >
              <BrowserRouter>
                <div className="app">
                  {/* Animated Gold Particles Background */}
                  <GoldParticles />

                  {/* Smart Realtime Notifications */}
                  <SmartNotification
                    notification={notification}
                    onDismiss={() => setNotification(null)}
                    onAction={handleNotificationAction}
                  />

                  <Suspense fallback={<LuxuryLoader />}>
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
                  </Suspense>

                  <Navigation />
                  {/* Admin Debug Panel */}
                  <AdminPanel />
                  {/* WebSocket Status Indicator - only in debug mode */}
                  <AdminAwareWSIndicator />
                </div>
              </BrowserRouter>
            </WebSocketProvider>
          </ToastProvider>
        </AdminProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

// Main App wrapper
function App() {
  return <AppContent />
}

export default App

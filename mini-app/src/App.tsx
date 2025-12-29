import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { LoadingScreen } from './components/LoadingScreen'
import { PremiumSplashScreen } from './components/PremiumSplashScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PromoProvider } from './contexts/PromoContext'
import { ClubProvider } from './contexts/ClubContext'
import { DeviceCapabilityProvider } from './contexts/DeviceCapabilityContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { GestureGuardProvider } from './components/ui/GestureGuard'
import { AdminPanel } from './components/AdminPanel'
import { useUserData } from './hooks/useUserData'
import {
  WebSocketProvider,
  OrderUpdateMessage,
  BalanceUpdateMessage,
  ProgressUpdateMessage,
  NotificationMessage,
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
const OrderDetailPageV8 = lazy(() => import('./pages/OrderDetailPageV8').then(module => ({ default: module.OrderDetailPageV8 })))
// Club Pages (replacing old RoulettePage)
const ClubPage = lazy(() => import('./pages/ClubPage'))
const RewardsStorePage = lazy(() => import('./pages/RewardsStorePage'))
const MyVouchersPage = lazy(() => import('./pages/MyVouchersPage'))
const PrivilegesPage = lazy(() => import('./pages/PrivilegesPage'))
const ClubHistoryPage = lazy(() => import('./pages/ClubHistoryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePageNew'))
const CreateOrderPage = lazy(() => import('./pages/CreateOrderPage').then(module => ({ default: module.CreateOrderPage })))
const ReferralPage = lazy(() => import('./pages/ReferralPage').then(module => ({ default: module.ReferralPage })))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(module => ({ default: module.AchievementsPage })))
const SupportPage = lazy(() => import('./pages/SupportPage').then(module => ({ default: module.SupportPage })))
const OrderChatPage = lazy(() => import('./pages/OrderChatPage').then(module => ({ default: module.OrderChatPage })))
const BatchPaymentPage = lazy(() => import('./pages/BatchPaymentPage').then(module => ({ default: module.BatchPaymentPage })))
// AdminDashboardPage removed as per instruction
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })))
const GodModePage = lazy(() => import('./pages/GodModePage').then(module => ({ default: module.GodModePage })))

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

// Smart notification wrapper with React Router navigation
interface NotificationHandlerProps {
  notification: SmartNotificationData | null
  onDismiss: () => void
}

function NotificationHandler({ notification, onDismiss }: NotificationHandlerProps) {
  const navigate = useNavigate()

  const handleAction = useCallback((action: string, data: Record<string, unknown>) => {
    if (action === 'view_order') {
      const orderId = data.order_id || data.orderId
      if (orderId) {
        navigate(`/order/${orderId}`)
      }
    }
  }, [navigate])

  return (
    <SmartNotification
      notification={notification}
      onDismiss={onDismiss}
      onAction={handleAction}
    />
  )
}

function AppContent() {
  const { userData, loading: userDataLoading, error, refetch } = useUserData()
  const [isReady, setIsReady] = useState(false)
  const [splashComplete, setSplashComplete] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  // Smart notification state - handles all notification types
  const [notification, setNotification] = useState<SmartNotificationData | null>(null)

  // WebSocket handlers - now unified for smart notifications
  const handleOrderUpdate = useCallback((msg: OrderUpdateMessage) => {
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
      title: msg.title || 'Обновление заказа',
      message: msg.message || `Статус: ${msg.status}`,
      icon: msg.icon || 'package',
      color: msg.color || '#d4af37',
      priority: msg.priority || 'normal',
      action: msg.action || 'view_order', // Default action to view order
      celebration: msg.celebration,
      confetti: msg.confetti,
      data: mergedData,
    }

    setNotification(smartData)
    refetch()
  }, [refetch])

  const handleBalanceUpdate = useCallback((msg: BalanceUpdateMessage) => {
    const smartData: SmartNotificationData = {
      type: 'balance_update',
      title: msg.title || (msg.change > 0 ? 'Баланс пополнен' : 'Списание'),
      message: msg.message || msg.reason,
      icon: msg.icon || (msg.change > 0 ? 'trending-up' : 'trending-down'),
      color: msg.color || (msg.change > 0 ? '#22c55e' : '#ef4444'),
      balance: msg.balance,
      change: msg.change,
      celebration: msg.celebration,
    }

    setNotification(smartData)
    refetch()
  }, [refetch])

  const handleNotification = useCallback((msg: NotificationMessage) => {
    const smartData: SmartNotificationData = {
      type: 'notification',
      notification_type: msg.notification_type,
      title: msg.title,
      message: msg.message,
      icon: msg.icon || 'bell',
      color: msg.color || '#d4af37',
    }

    setNotification(smartData)
  }, [])

  // Handle progress updates
  const handleProgressUpdate = useCallback((msg: ProgressUpdateMessage) => {
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

  const handleRefresh = useCallback(() => {
    // Trigger data refresh based on refresh_type from server
    refetch()
  }, [refetch])


  useEffect(() => {
    // Mark ready after minimum time
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Check if this is the first time the user opens the app in this session
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('as_splash_seen')
    if (hasSeenSplash) {
      setShowSplash(false)
      setSplashComplete(true)
    }
  }, [])

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('as_splash_seen', 'true')
    setSplashComplete(true)
    setShowSplash(false)
  }, [])

  // Get telegram ID for WebSocket - need it before loading check
  const telegramId = userData?.telegram_id || null

  // Show premium splash screen on first load
  if (showSplash && !splashComplete) {
    return <PremiumSplashScreen onComplete={handleSplashComplete} />
  }

  // Show simple loading screen if still fetching user data after splash
  if (!isReady || userDataLoading) {
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
            {/* Always show notifications even on error screen - no navigation action needed */}
            <SmartNotification
              notification={notification}
              onDismiss={() => setNotification(null)}
            />
            {/* ═══════════════════════════════════════════════════════════════════
                PREMIUM ERROR SCREEN — Elegant, not alarming
                ═══════════════════════════════════════════════════════════════════ */}
            <div style={{
              minHeight: '100vh',
              background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              gap: 24,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle background glow */}
              <div style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 300,
                height: 300,
                background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Icon container — gold themed, not red */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.1)',
                  position: 'relative',
                }}
              >
                {/* Top gold accent */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
                  borderRadius: '24px 24px 0 0',
                }} />
                <AlertTriangle size={36} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
              </motion.div>

              {/* Text content */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
              >
                <h2 style={{
                  fontFamily: "var(--font-serif, 'Playfair Display', serif)",
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                  margin: 0,
                  marginBottom: 12,
                  letterSpacing: '0.02em',
                }}>
                  Что-то пошло не так
                </h2>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.4)',
                  margin: 0,
                  lineHeight: 1.6,
                  maxWidth: 280,
                }}>
                  {error}
                </p>
              </motion.div>

              {/* Retry button — premium gold */}
              <motion.button
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.reload()}
                style={{
                  padding: '14px 32px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0a0a0c',
                  background: 'linear-gradient(180deg, #f5d485, #D4AF37)',
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
                  letterSpacing: '0.02em',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <RefreshCw size={16} strokeWidth={2} />
                Попробовать снова
              </motion.button>

              {/* Elegant footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  position: 'absolute',
                  bottom: 40,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{
                  width: 20,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3))',
                }} />
                <span style={{
                  fontSize: 9,
                  color: 'rgba(212,175,55,0.4)',
                  letterSpacing: '0.15em',
                  fontFamily: "var(--font-serif, 'Playfair Display', serif)",
                }}>
                  САЛУН
                </span>
                <span style={{ fontSize: 8, color: 'rgba(212,175,55,0.3)' }}>✦</span>
                <span style={{
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.1em',
                }}>
                  EST. 2024
                </span>
                <div style={{
                  width: 20,
                  height: 1,
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)',
                }} />
              </motion.div>
            </div>
          </WebSocketProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* DeviceCapabilityProvider - adaptive effects based on device performance */}
        <DeviceCapabilityProvider>
          {/* PromoProvider stays mounted even during loading to preserve state */}
          <PromoProvider>
            <AdminProvider>
              <ClubProvider userId={telegramId || undefined}>
                <NavigationProvider>
                  <GestureGuardProvider>
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
                          {/* Smart Realtime Notifications with React Router navigation */}
                          <NotificationHandler
                            notification={notification}
                            onDismiss={() => setNotification(null)}
                          />

                          <Suspense fallback={<LoadingScreen />}>
                            <Routes>
                              <Route path="/" element={<HomePage user={userData} />} />
                              <Route path="/orders" element={<OrdersPage orders={userData?.orders || []} />} />
                              <Route path="/order/:id" element={<OrderDetailPageV8 />} />
                              <Route path="/order/:id/chat" element={<OrderChatPage />} />
                              {/* Club Routes */}
                              <Route path="/club" element={<ClubPage user={userData} />} />
                              <Route path="/club/rewards" element={<RewardsStorePage />} />
                              <Route path="/club/vouchers" element={<MyVouchersPage />} />
                              <Route path="/club/privileges" element={<PrivilegesPage />} />
                              <Route path="/club/history" element={<ClubHistoryPage />} />
                              <Route path="/profile" element={<ProfilePage user={userData} />} />
                              <Route path="/create-order" element={<CreateOrderPage />} />
                              <Route path="/referral" element={<ReferralPage user={userData} />} />
                              <Route path="/achievements" element={<AchievementsPage user={userData} />} />
                              <Route path="/support" element={<SupportPage />} />
                              <Route path="/batch-payment" element={<BatchPaymentPage />} />
                              <Route path="/admin" element={<AdminPage />} />
                              <Route path="/god" element={<GodModePage />} />
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
                  </GestureGuardProvider>
                </NavigationProvider>
              </ClubProvider>
            </AdminProvider>
          </PromoProvider>
        </DeviceCapabilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

// Main App wrapper
function App() {
  return <AppContent />
}

export default App

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { RoulettePage } from './pages/RoulettePage'
import { ProfilePage } from './pages/ProfilePage'
import { CreateOrderPage } from './pages/CreateOrderPage'
import { Navigation } from './components/Navigation'
import { LoadingScreen } from './components/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GoldParticles } from './components/ui/GoldParticles'
import { ToastProvider } from './components/ui/Toast'
import { useUserData } from './hooks/useUserData'
import { AlertTriangle, RefreshCw } from 'lucide-react'

function App() {
  const { userData, loading, error } = useUserData()
  const [isReady, setIsReady] = useState(false)

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

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="app">
            {/* Animated Gold Particles Background */}
            <GoldParticles />
            <Routes>
              <Route path="/" element={<HomePage user={userData} />} />
              <Route path="/orders" element={<OrdersPage orders={userData?.orders || []} />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
              <Route path="/roulette" element={<RoulettePage user={userData} />} />
              <Route path="/profile" element={<ProfilePage user={userData} />} />
              <Route path="/create-order" element={<CreateOrderPage />} />
            </Routes>
            <Navigation />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

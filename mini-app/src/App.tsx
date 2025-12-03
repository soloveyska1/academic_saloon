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
import { useUserData } from './hooks/useUserData'

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
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>Ошибка загрузки</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app">
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
  )
}

export default App

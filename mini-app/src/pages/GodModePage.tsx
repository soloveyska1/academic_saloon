/**
 * GOD MODE v3 — Thin Orchestrator
 * Auth guard → GodShell → 7 tabs → WebSocket notifications
 */
import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { getLastAppRoute } from '../utils/navigation'

import { getActiveTab, withRouteParams, type TabId } from '../components/god/godConstants'
import { useGodWebSocket } from '../components/god/godHooks'
import { GodShell, NotificationToast } from '../components/god/GodShell'
import { God2FAGate } from '../components/god/God2FAGate'
import { CenterTab } from '../components/god/CenterTab'
import { OrdersTab } from '../components/god/OrdersTab'
import { ClientsTab } from '../components/god/ClientsTab'
import { AnalyticsTab } from '../components/god/AnalyticsTab'
import { MarketingTab } from '../components/god/MarketingTab'
import { RadarTab } from '../components/god/RadarTab'
import { ToolsTab } from '../components/god/ToolsTab'

import s from './GodModePage.module.css'

export function GodModePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin, telegramId, simulateNewUser, toggleSimulateNewUser, accessResolved } = useAdmin()
  const [is2FAVerified, setIs2FAVerified] = useState(false)
  const activeTab = useMemo(() => getActiveTab(searchParams), [searchParams])
  const appReturnPath = useMemo(() => getLastAppRoute(), [])

  // WebSocket notifications
  const { notifications, soundEnabled, unreadCount, toggleSound, dismissFirst } =
    useGodWebSocket(isAdmin, telegramId, activeTab)

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setSearchParams(
        withRouteParams(searchParams, { tab, order_q: null, order_status: null, user_q: null, user_filter: null }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  const handleBack = useCallback(
    () => navigate(appReturnPath || '/'),
    [navigate, appReturnPath],
  )

  /* Auth guards */
  if (!accessResolved) {
    return (
      <div className={s.loadingScreen}>
        <div className={s.mutedSmall} style={{ padding: 48, textAlign: 'center' }}>Проверка доступа…</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={s.deniedScreen}>
        <div className={s.deniedIcon}><Shield size={28} color="#ef4444" /></div>
        <h1 className={s.deniedTitle}>Доступ закрыт</h1>
        <p className={s.deniedText}>Нет прав администратора.</p>
      </div>
    )
  }

  /* 2FA gate — must verify before accessing dashboard */
  if (!is2FAVerified) {
    return (
      <God2FAGate
        onAuthenticated={() => setIs2FAVerified(true)}
        onBack={handleBack}
      />
    )
  }

  return (
    <>
      <GodShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        simulateNewUser={simulateNewUser}
        onToggleSimulate={toggleSimulateNewUser}
        unreadCount={unreadCount}
        onBack={handleBack}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'center' && <CenterTab key="center" />}
          {activeTab === 'orders' && <OrdersTab key="orders" />}
          {activeTab === 'clients' && <ClientsTab key="clients" />}
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
          {activeTab === 'marketing' && <MarketingTab key="marketing" />}
          {activeTab === 'radar' && <RadarTab key="radar" />}
          {activeTab === 'tools' && <ToolsTab key="tools" />}
        </AnimatePresence>
      </GodShell>

      {/* Floating notification toast */}
      <NotificationToast notifications={notifications} onDismiss={dismissFirst} />
    </>
  )
}

export default GodModePage

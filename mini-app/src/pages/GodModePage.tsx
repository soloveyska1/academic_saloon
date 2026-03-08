/**
 * GOD MODE v2 — Compact Admin Panel
 * Thin orchestrator: auth → topbar → tabs → content
 */

import { useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Crown, ArrowLeft, Users, Volume2, VolumeX, Bell, Shield,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { getLastAppRoute } from '../utils/navigation'

import { getActiveTab, withRouteParams } from '../components/god/godHelpers'
import type { TabId } from '../components/god/godHelpers'
import { LoadingSpinner } from '../components/god/GodShared'
import { GodTabBar } from '../components/god/GodTabBar'
import { useGodWebSocket, NotificationToast } from '../components/god/GodNotifications'
import { GodDashboard } from '../components/god/GodDashboard'
import { GodOrders } from '../components/god/GodOrders'
import { GodUsers } from '../components/god/GodUsers'
import { GodPromos } from '../components/god/GodPromos'
import { GodLive } from '../components/god/GodLive'
import { GodLogs } from '../components/god/GodLogs'
import { GodSQL } from '../components/god/GodSQL'
import { GodBroadcast } from '../components/god/GodBroadcast'

import s from './GodModePage.module.css'

export function GodModePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin, telegramId, simulateNewUser, toggleSimulateNewUser, accessResolved } = useAdmin()
  const activeTab = useMemo(() => getActiveTab(searchParams), [searchParams])
  const appReturnPath = useMemo(() => getLastAppRoute(), [])

  const {
    notifications, soundEnabled, unreadCount, toggleSound, dismissFirst,
  } = useGodWebSocket(isAdmin, telegramId, activeTab)

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setSearchParams(
        withRouteParams(searchParams, {
          tab,
          order_q: null, order_status: null,
          user_q: null, user_filter: null,
        }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  /* Auth guards */
  if (!accessResolved) {
    return (
      <div className={s.loadingScreen}>
        <LoadingSpinner />
        <div className={s.loadingLabel}>Проверка доступа…</div>
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

  return (
    <div className={s.adminPage}>
      {/* ── Compact top bar ── */}
      <div className={s.stickyHeader}>
        <div className={s.topBar}>
          <div className={s.topBarLogo}>
            <Crown size={14} color="#0a0a0c" strokeWidth={2.5} />
          </div>
          <span className={s.topBarTitle}>God Mode</span>

          <div className={s.topBarActions}>
            {/* Sound */}
            <button
              type="button"
              onClick={toggleSound}
              className={soundEnabled ? s.topBarBtnActive : s.topBarBtn}
              title={soundEnabled ? 'Звук вкл' : 'Звук выкл'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Simulate new user */}
            <button
              type="button"
              onClick={toggleSimulateNewUser}
              className={simulateNewUser ? s.topBarBtnActive : s.topBarBtn}
              title="Тест новичка"
            >
              <Users size={15} />
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => handleTabChange('dashboard')}
                className={unreadCount > 0 ? s.topBarBtnDanger : s.topBarBtn}
              >
                <Bell size={15} />
              </button>
              {unreadCount > 0 && <span className={s.unreadBadge}>{unreadCount}</span>}
            </div>

            {/* Back */}
            <button
              type="button"
              onClick={() => navigate(appReturnPath || '/')}
              className={s.topBarBtn}
              title="Назад"
            >
              <ArrowLeft size={15} />
            </button>
          </div>
        </div>

        <GodTabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Toast */}
      <NotificationToast notifications={notifications} onDismiss={dismissFirst} />

      {/* ── Content ── */}
      <div className={s.content}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <GodDashboard key="d" />}
          {activeTab === 'orders' && <GodOrders key="o" />}
          {activeTab === 'users' && <GodUsers key="u" />}
          {activeTab === 'promos' && <GodPromos key="p" />}
          {activeTab === 'live' && <GodLive key="l" />}
          {activeTab === 'logs' && <GodLogs key="lg" />}
          {activeTab === 'sql' && <GodSQL key="s" />}
          {activeTab === 'broadcast' && <GodBroadcast key="b" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default GodModePage

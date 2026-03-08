/**
 * GOD MODE - Full Admin Control Panel (Orchestrator)
 * ===================================================
 * Thin shell: auth guards, header, tabs, WebSocket → delegates to tab components.
 * Access restricted to ADMIN_IDS only (verified via Telegram initData).
 */

import { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Home, Users, Bell, Shield,
  Volume2, VolumeX,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { getLastAppRoute } from '../utils/navigation'

import { getActiveTab, withRouteParams, formatPageLabel, TAB_META } from '../components/god/godHelpers'
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
  const appReturnLabel = useMemo(
    () => formatPageLabel(appReturnPath.split('?')[0] || '/'),
    [appReturnPath],
  )

  /* ═══════ WebSocket ═══════ */

  const {
    notifications,
    soundEnabled,
    unreadCount,
    toggleSound,
    dismissFirst,
  } = useGodWebSocket(isAdmin, telegramId, activeTab)

  /* ═══════ Handlers ═══════ */

  const handleTabChange = useCallback(
    (tab: TabId) => {
      const next = withRouteParams(searchParams, {
        tab,
        order_q: null,
        order_status: null,
        user_q: null,
        user_filter: null,
      })
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleReturnToApp = useCallback(() => {
    navigate(appReturnPath || '/')
  }, [appReturnPath, navigate])

  /* ═══════ Auth guards ═══════ */

  if (!accessResolved) {
    return (
      <div className={s.loadingScreen}>
        <LoadingSpinner />
        <div className={s.loadingLabel}>Проверяем доступ к операционному центру</div>
        <div className={s.loadingSub}>
          Подтягиваем Telegram-сессию и права администратора.
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={s.deniedScreen}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={s.deniedIcon}>
          <Shield size={40} color="#ef4444" />
        </motion.div>
        <h1 className={s.deniedTitle}>Доступ закрыт</h1>
        <p className={s.deniedText}>
          У вас нет доступа к админ-панели. Если это ошибка, проверьте права доступа.
        </p>
      </div>
    )
  }

  /* ═══════ Render ═══════ */

  return (
    <div className={s.adminPage}>
      {/* ── Sticky header ── */}
      <div className={s.stickyHeader}>
        <div className={s.headerCard}>
          <div className={s.headerTop}>
            <div className={s.headerInfo}>
              <div className={s.headerCrown}>
                <Crown size={24} color="#0a0a0c" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={s.headerEyebrow}>Админка салона</div>
                <h1 className={s.headerTitle}>Операционный центр</h1>
                <p className={s.headerDescription}>
                  Заказы, клиенты, промокоды и вся операционная работа в одном ритме с приложением.
                </p>
              </div>
            </div>

            <div className={s.headerActions}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleReturnToApp}
                className={s.secondaryBtn}
                title={`Вернуться на экран "${appReturnLabel}"`}
              >
                <Home size={16} /> Вернуться в приложение
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={toggleSimulateNewUser}
                className={s.secondaryBtn}
                style={{
                  background: simulateNewUser
                    ? 'linear-gradient(180deg, rgba(168,85,247,0.22), rgba(124,58,237,0.16))'
                    : undefined,
                  border: simulateNewUser ? '1px solid rgba(196,181,253,0.32)' : '1px solid rgba(255,255,255,0.08)',
                  color: simulateNewUser ? '#ddd6fe' : '#fff',
                }}
                title={simulateNewUser ? 'Выключить полный сценарий новичка' : 'Включить полный сценарий новичка'}
              >
                <Users size={16} />
                {simulateNewUser ? 'Тест новичка активен' : 'Сценарий новичка'}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={toggleSound}
                className={s.secondaryBtn}
                style={{
                  background: soundEnabled
                    ? 'linear-gradient(180deg, rgba(34,197,94,0.18), rgba(21,128,61,0.12))'
                    : 'linear-gradient(180deg, rgba(239,68,68,0.16), rgba(153,27,27,0.12))',
                  border: `1px solid ${soundEnabled ? 'rgba(34,197,94,0.26)' : 'rgba(239,68,68,0.26)'}`,
                  color: soundEnabled ? '#bbf7d0' : '#fecaca',
                }}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {soundEnabled ? 'Звук включён' : 'Звук выключен'}
              </motion.button>
            </div>
          </div>

          {/* Badges */}
          <div className={s.headerBadges}>
            <span className={s.badgeGoldEyebrow}>
              Раздел: {TAB_META.find((t) => t.id === activeTab)?.label}
            </span>
            <span className={s.badgeNeutral}>Возврат: {appReturnLabel}</span>
            <span
              className={unreadCount > 0 ? s.badgeDanger : s.badgeSuccess}
            >
              <Bell size={14} />
              {unreadCount > 0 ? `${unreadCount} новых сигналов` : 'Сигналы под контролем'}
            </span>
          </div>

          {/* Notification toast */}
          <NotificationToast notifications={notifications} onDismiss={dismissFirst} />
        </div>

        {/* Tabs */}
        <GodTabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* ── Content ── */}
      <div className={s.content}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <GodDashboard key="dashboard" />}
          {activeTab === 'orders' && <GodOrders key="orders" />}
          {activeTab === 'users' && <GodUsers key="users" />}
          {activeTab === 'promos' && <GodPromos key="promos" />}
          {activeTab === 'live' && <GodLive key="live" />}
          {activeTab === 'logs' && <GodLogs key="logs" />}
          {activeTab === 'sql' && <GodSQL key="sql" />}
          {activeTab === 'broadcast' && <GodBroadcast key="broadcast" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default GodModePage

/**
 * God Mode v3 — Shell Component
 * Top bar + Tab bar + Notification toast
 */
import { memo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Volume2, VolumeX, UserPlus, Bell,
  LogOut, Package, CreditCard, X,
  Zap, Package as PackageIcon, Users, BarChart3, Target, Radar, Terminal,
} from 'lucide-react'
import { TABS, type TabId } from './godConstants'
import type { AdminNotification } from './godConstants'
import s from '../../pages/GodModePage.module.css'

/* ═══════ Tab icons mapping ═══════ */

const TAB_ICONS: Record<string, ReactNode> = {
  center: <Zap size={14} />,
  orders: <PackageIcon size={14} />,
  clients: <Users size={14} />,
  analytics: <BarChart3 size={14} />,
  marketing: <Target size={14} />,
  radar: <Radar size={14} />,
  tools: <Terminal size={14} />,
}

/* ═══════ GodShell (Top Bar + Tabs) ═══════ */

interface GodShellProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  soundEnabled: boolean
  onToggleSound: () => void
  simulateNewUser: boolean
  onToggleSimulate: () => void
  unreadCount: number
  onBack: () => void
  children: ReactNode
}

export const GodShell = memo(function GodShell({
  activeTab, onTabChange, soundEnabled, onToggleSound,
  simulateNewUser, onToggleSimulate, unreadCount, onBack, children,
}: GodShellProps) {
  return (
    <div className={s.adminPage}>
      <div className={s.stickyHeader}>
        {/* Top Bar */}
        <div className={s.topBar}>
          <div className={s.topBarLogo}>
            <Crown size={16} color="#0a0a0c" strokeWidth={2.5} />
          </div>
          <div className={s.topBarTitle}>God Mode</div>
          <div className={s.topBarActions}>
            <button type="button" className={soundEnabled ? s.topBarBtnActive : s.topBarBtn} onClick={onToggleSound}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button type="button" className={simulateNewUser ? s.topBarBtnDanger : s.topBarBtn} onClick={onToggleSimulate}>
              <UserPlus size={14} />
            </button>
            <div style={{ position: 'relative' }}>
              <button type="button" className={s.topBarBtn} onClick={() => onTabChange('center')}>
                <Bell size={14} />
              </button>
              {unreadCount > 0 && <div className={s.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
            </div>
            <button type="button" className={s.exitBtn} onClick={onBack}>
              <LogOut size={13} />
              Выйти
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className={s.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? s.tabButtonActive : s.tabButton}
              onClick={() => onTabChange(tab.id)}
            >
              {TAB_ICONS[tab.id]}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.content}>{children}</div>
    </div>
  )
})

/* ═══════ NotificationToast ═══════ */

interface NotifToastProps {
  notifications: AdminNotification[]
  onDismiss: () => void
}

export const NotificationToast = memo(function NotificationToast({ notifications, onDismiss }: NotifToastProps) {
  const latest = notifications[0]
  const isVisible = latest && latest.timestamp > new Date(Date.now() - 5000)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={s.notifToast}
          style={{
            background: latest.type === 'new_order' ? 'rgba(34,197,94,0.15)' : 'rgba(236,72,153,0.15)',
            border: `1px solid ${latest.type === 'new_order' ? 'rgba(34,197,94,0.3)' : 'rgba(236,72,153,0.3)'}`,
          }}
        >
          <div
            className={s.notifIcon}
            style={{ background: latest.type === 'new_order' ? 'rgba(34,197,94,0.2)' : 'rgba(236,72,153,0.2)' }}
          >
            {latest.type === 'new_order'
              ? <Package size={14} color="#22c55e" />
              : <CreditCard size={14} color="#ec4899" />}
          </div>
          <div className={s.flex1}>
            <div style={{ fontSize: 12, fontWeight: 600, color: latest.type === 'new_order' ? '#22c55e' : '#ec4899', marginBottom: 2 }}>
              {latest.title}
            </div>
            <div style={{ fontSize: 11, color: '#a1a1aa', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
              {latest.message}
            </div>
          </div>
          <button type="button" onClick={onDismiss} className={s.ghostBtn}><X size={14} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

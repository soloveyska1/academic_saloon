import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  UserPlus,
  Infinity,
  Eye,
  CreditCard,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Shield,
  RefreshCw
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'

interface ToggleItemProps {
  icon: React.ElementType
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  color?: string
}

function ToggleItem({ icon: Icon, label, description, enabled, onToggle, color = '#d4af37' }: ToggleItemProps) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: enabled
          ? `linear-gradient(135deg, ${color}15 0%, transparent 100%)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${enabled ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: enabled
            ? `linear-gradient(135deg, ${color}, ${color}aa)`
            : 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={enabled ? '#0a0a0c' : '#71717a'} />
      </div>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: enabled ? '#f2f2f2' : '#a1a1aa',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#71717a',
          }}
        >
          {description}
        </div>
      </div>

      {/* Toggle indicator */}
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: enabled
            ? `linear-gradient(90deg, ${color}, ${color}cc)`
            : 'rgba(255,255,255,0.1)',
          padding: 2,
          display: 'flex',
          alignItems: enabled ? 'center' : 'center',
          justifyContent: enabled ? 'flex-end' : 'flex-start',
          transition: 'all 0.2s',
        }}
      >
        <motion.div
          layout
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            background: enabled ? '#0a0a0c' : '#52525b',
          }}
        />
      </div>
    </motion.button>
  )
}

// Secret activation hook - triple tap detector
function useSecretActivation(onActivate: () => void) {
  const [tapCount, setTapCount] = useState(0)
  const [lastTapTime, setLastTapTime] = useState(0)

  const handleTap = useCallback(() => {
    const now = Date.now()
    // Reset if more than 500ms between taps
    if (now - lastTapTime > 500) {
      setTapCount(1)
    } else {
      const newCount = tapCount + 1
      setTapCount(newCount)
      if (newCount >= 5) {
        onActivate()
        setTapCount(0)
      }
    }
    setLastTapTime(now)
  }, [tapCount, lastTapTime, onActivate])

  // Reset after timeout
  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => setTapCount(0), 1000)
      return () => clearTimeout(timer)
    }
  }, [tapCount])

  return handleTap
}

// Export the hook for use in other components
export { useSecretActivation }

export function AdminPanel() {
  const admin = useAdmin()
  const [isOpen, setIsOpen] = useState(false)

  // Register this panel's opener globally
  useEffect(() => {
    setAdminPanelOpener(() => setIsOpen(true))
    return () => { openAdminPanelFn = null }
  }, [])

  // Don't render if not admin
  if (!admin.isAdmin) {
    return null
  }

  // No floating button anymore - panel is opened via secret activation
  // from HomePage header badge (5 taps on "ЭЛИТНЫЙ КЛУБ")

  return (
    <>
      {/* Panel - slides in from right edge */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 9997,
              }}
            />
            <motion.div
              initial={{ opacity: 0, x: 320 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 320 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed',
                top: 'env(safe-area-inset-top, 20px)',
                right: 0,
                bottom: 0,
                width: 320,
                maxWidth: '85vw',
                background: 'linear-gradient(180deg, rgba(20, 20, 23, 0.98) 0%, rgba(10, 10, 12, 0.99) 100%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderLeft: '1px solid rgba(212, 175, 55, 0.2)',
                overflow: 'hidden',
                boxShadow: `
                  -20px 0 60px -15px rgba(0, 0, 0, 0.8),
                  0 0 40px -10px rgba(212, 175, 55, 0.15)
                `,
                zIndex: 9998,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 18px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(212, 175, 55, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #d4af37, #8b6914)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Shield size={16} color="#0a0a0c" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#f2f2f2',
                      }}
                    >
                      ADMIN PANEL
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#71717a',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Debug & Test Mode
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={() => setIsOpen(false)}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#ef4444" />
                </motion.button>
              </div>

              {/* Content */}
              <div style={{ overflowY: 'auto', height: 'calc(100% - 80px)' }}>
                <div
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <ToggleItem
                    icon={UserPlus}
                    label="Новый пользователь"
                    description="Симулировать нового юзера"
                    enabled={admin.simulateNewUser}
                    onToggle={admin.toggleSimulateNewUser}
                    color="#3b82f6"
                  />

                  <ToggleItem
                    icon={Infinity}
                    label="Безлимит рулетки"
                    description="Крутить без ограничений"
                    enabled={admin.unlimitedRoulette}
                    onToggle={admin.toggleUnlimitedRoulette}
                    color="#22c55e"
                  />

                  <ToggleItem
                    icon={Eye}
                    label="Debug Info"
                    description="Показать отладочную инфу"
                    enabled={admin.showDebugInfo}
                    onToggle={admin.toggleShowDebugInfo}
                    color="#a855f7"
                  />

                  <ToggleItem
                    icon={CreditCard}
                    label="Bypass Payments"
                    description="Пропустить оплату"
                    enabled={admin.bypassPayments}
                    onToggle={admin.toggleBypassPayments}
                    color="#f59e0b"
                  />

                  {/* Refresh Data Button */}
                  <motion.button
                    onClick={() => window.location.reload()}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 14px',
                      marginTop: 8,
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      color: '#3b82f6',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={16} />
                    Обновить данные
                  </motion.button>

                  {/* Reset Button */}
                  <motion.button
                    onClick={admin.resetAllSettings}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 14px',
                      marginTop: 8,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      color: '#ef4444',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={16} />
                    Сбросить все настройки
                  </motion.button>
                </div>

                {/* Debug Info Section */}
                {admin.showDebugInfo && (
                  <div
                    style={{
                      margin: '0 16px 16px',
                      padding: 12,
                      background: 'rgba(168, 85, 247, 0.05)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: '#a1a1aa',
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ color: '#a855f7', marginBottom: 8, fontWeight: 600 }}>
                      DEBUG INFO:
                    </div>
                    <div>TG User ID: {window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'N/A'}</div>
                    <div>Username: @{window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'N/A'}</div>
                    <div>Platform: {navigator.platform}</div>
                    <div>Screen: {window.innerWidth}×{window.innerHeight}</div>
                    <div>New User Mode: {admin.simulateNewUser ? 'ON' : 'OFF'}</div>
                    <div>Unlimited Roulette: {admin.unlimitedRoulette ? 'ON' : 'OFF'}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Export a function to open the panel from outside
let openAdminPanelFn: (() => void) | null = null

export function setAdminPanelOpener(fn: () => void) {
  openAdminPanelFn = fn
}

export function openAdminPanel() {
  openAdminPanelFn?.()
}

// Hook version for components
export function useAdminPanel() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setAdminPanelOpener(() => setIsOpen(true))
    return () => { openAdminPanelFn = null }
  }, [])

  return { isOpen, setIsOpen }
}

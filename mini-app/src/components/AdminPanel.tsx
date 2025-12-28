import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  X,
  UserPlus,
  Infinity,
  Eye,
  RotateCcw,
  Shield,
  RefreshCw,
  LayoutDashboard,
  Gift,
  Zap,
  Trophy
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'
import { resetDailyBonusCooldown, resetDailyBonusFull, setDailyBonusStreak } from '../api/userApi'

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
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [bonusStatus, setBonusStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Register this panel's opener globally
  useEffect(() => {
    setAdminPanelOpener(() => setIsOpen(true))
    return () => { openAdminPanelFn = null }
  }, [])

  // Daily bonus testing handlers
  const handleResetCooldown = useCallback(async () => {
    setIsLoading(true)
    setBonusStatus(null)
    try {
      const result = await resetDailyBonusCooldown()
      setBonusStatus(result.success ? `✓ ${result.message}` : `✗ Ошибка`)
      if (result.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      }
    } catch (e) {
      setBonusStatus('✗ Ошибка запроса')
    }
    setIsLoading(false)
    setTimeout(() => setBonusStatus(null), 3000)
  }, [])

  const handleResetFull = useCallback(async () => {
    setIsLoading(true)
    setBonusStatus(null)
    try {
      const result = await resetDailyBonusFull()
      setBonusStatus(result.success ? `✓ Стрик сброшен на 0` : `✗ Ошибка`)
      if (result.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      }
    } catch (e) {
      setBonusStatus('✗ Ошибка запроса')
    }
    setIsLoading(false)
    setTimeout(() => setBonusStatus(null), 3000)
  }, [])

  const handleSetStreak = useCallback(async (streak: number) => {
    setIsLoading(true)
    setBonusStatus(null)
    try {
      const result = await setDailyBonusStreak(streak)
      const milestoneInfo = result.next_milestone
        ? ` → Следующий milestone: ${result.next_milestone.day}д (+${result.next_milestone.reward}₽)`
        : ''
      setBonusStatus(result.success ? `✓ Streak = ${streak}${milestoneInfo}` : `✗ Ошибка`)
      if (result.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      }
    } catch (e) {
      setBonusStatus('✗ Ошибка запроса')
    }
    setIsLoading(false)
    setTimeout(() => setBonusStatus(null), 4000)
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

                  {/* Daily Bonus Testing Section */}
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(34, 197, 94, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <Gift size={16} color="#22c55e" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
                        ТЕСТ ЕЖЕДНЕВНОГО БОНУСА
                      </span>
                    </div>

                    {/* Status message */}
                    {bonusStatus && (
                      <div
                        style={{
                          fontSize: 11,
                          padding: '6px 10px',
                          marginBottom: 10,
                          borderRadius: 6,
                          background: bonusStatus.startsWith('✓')
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          color: bonusStatus.startsWith('✓') ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {bonusStatus}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Reset cooldown only */}
                      <motion.button
                        onClick={handleResetCooldown}
                        disabled={isLoading}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 8,
                          cursor: isLoading ? 'wait' : 'pointer',
                          color: '#22c55e',
                          fontSize: 12,
                          fontWeight: 500,
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        <Zap size={14} />
                        Сбросить cooldown
                      </motion.button>

                      {/* Full reset */}
                      <motion.button
                        onClick={handleResetFull}
                        disabled={isLoading}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 8,
                          cursor: isLoading ? 'wait' : 'pointer',
                          color: '#ef4444',
                          fontSize: 12,
                          fontWeight: 500,
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        <RotateCcw size={14} />
                        Полный сброс (streak = 0)
                      </motion.button>

                      {/* Set streak presets */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontSize: 10, color: '#71717a', alignSelf: 'center' }}>
                          Streak:
                        </span>
                        {[6, 13, 29, 59, 89].map(streak => (
                          <motion.button
                            key={streak}
                            onClick={() => handleSetStreak(streak)}
                            disabled={isLoading}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(212, 175, 55, 0.1)',
                              border: '1px solid rgba(212, 175, 55, 0.2)',
                              borderRadius: 6,
                              cursor: isLoading ? 'wait' : 'pointer',
                              color: '#d4af37',
                              fontSize: 11,
                              fontWeight: 500,
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >
                            {streak}
                          </motion.button>
                        ))}
                      </div>
                      <div style={{ fontSize: 9, color: '#52525b', marginTop: 2 }}>
                        Установите streak перед milestone для теста (7, 14, 30, 60, 90)
                      </div>
                    </div>
                  </div>

                  {/* Admin Dashboard Button */}
                  <motion.button
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/admin')
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 14px',
                      marginTop: 8,
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      color: '#d4af37',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <LayoutDashboard size={16} />
                    Админ-панель
                  </motion.button>

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

                {/* Rank Simulation Section */}
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: 'rgba(212, 175, 55, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <Trophy size={16} color="#d4af37" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d4af37' }}>
                      СИМУЛЯЦИЯ УРОВНЯ
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Резидент (3%)', val: 3 },
                      { label: 'Партнёр (5%)', val: 5 },
                      { label: 'VIP (7%)', val: 7 },
                      { label: 'Премиум (10%)', val: 10 },
                    ].map((item) => {
                      const isActive = admin.simulatedRank === item.val
                      return (
                        <motion.button
                          key={item.val}
                          onClick={() => admin.setSimulatedRank(isActive ? null : item.val)}
                          whileTap={{ scale: 0.96 }}
                          style={{
                            padding: '8px',
                            background: isActive ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.05)',
                            border: `1px solid ${isActive ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.1)'}`,
                            borderRadius: 8,
                            color: isActive ? '#f2f2f2' : '#a1a1aa',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {item.label}
                        </motion.button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: '#71717a', marginTop: 8, textAlign: 'center' }}>
                    {admin.simulatedRank ? `Активна симуляция: ${admin.simulatedRank}%` : 'Симуляция отключена (реальные данные)'}
                  </div>
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
                      DEBUG INFO (v2025.12.28-0705):
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

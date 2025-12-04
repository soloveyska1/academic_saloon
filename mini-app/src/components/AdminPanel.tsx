import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bug,
  X,
  UserPlus,
  Infinity,
  Eye,
  CreditCard,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Shield
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

export function AdminPanel() {
  const admin = useAdmin()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Don't render if not admin
  if (!admin.isAdmin) {
    return null
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 16,
          width: 50,
          height: 50,
          borderRadius: 14,
          background: isOpen
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #d4af37, #b38728)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen
            ? '0 4px 20px rgba(239, 68, 68, 0.4)'
            : '0 4px 20px rgba(212, 175, 55, 0.4)',
          zIndex: 9999,
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X size={24} color="#fff" strokeWidth={2.5} />
          ) : (
            <Bug size={24} color="#0a0a0c" strokeWidth={2} />
          )}
        </motion.div>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 160,
              right: 16,
              width: 320,
              maxWidth: 'calc(100vw - 32px)',
              background: 'linear-gradient(180deg, rgba(20, 20, 23, 0.98) 0%, rgba(10, 10, 12, 0.99) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: `
                0 20px 60px -15px rgba(0, 0, 0, 0.8),
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
                padding: '16px 18px',
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
                      fontFamily: "'Playfair Display', serif",
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
                onClick={() => setIsMinimized(!isMinimized)}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMinimized ? (
                  <ChevronDown size={16} color="#71717a" />
                ) : (
                  <ChevronUp size={16} color="#71717a" />
                )}
              </motion.button>
            </div>

            {/* Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

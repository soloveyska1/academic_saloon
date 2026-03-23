import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Shield, Loader2, Send, ArrowLeft } from 'lucide-react'
import {
  requestGod2FACode,
  verifyGod2FACode,
  checkGod2FAStatus,
  getGod2FAToken,
} from '../../api/userApi'

// ═══════════════════════════════════════════════════════════════════════════
//  GOD 2FA GATE — PIN entry screen before God Mode access
//  Gold+onyx premium design matching the app's visual language.
// ═══════════════════════════════════════════════════════════════════════════

interface God2FAGateProps {
  onAuthenticated: () => void
  onBack: () => void
}

type Phase = 'checking' | 'send' | 'verify' | 'error'

export function God2FAGate({ onAuthenticated, onBack }: God2FAGateProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if we already have a valid session token
  useEffect(() => {
    const token = getGod2FAToken()
    if (!token) {
      setPhase('send')
      return
    }
    checkGod2FAStatus()
      .then(res => {
        if (res.authenticated) {
          onAuthenticated()
        } else {
          setPhase('send')
        }
      })
      .catch(() => setPhase('send'))
  }, [onAuthenticated])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Auto-focus input
  useEffect(() => {
    if (phase === 'verify') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase])

  const handleSendCode = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await requestGod2FACode()
      setPhase('verify')
      setCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки кода')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const result = await verifyGod2FACode(code)
      if (result.success) {
        onAuthenticated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код')
      setCode('')
    } finally {
      setLoading(false)
    }
  }, [code, onAuthenticated])

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && phase === 'verify' && !loading) {
      handleVerify()
    }
  }, [code, phase, loading, handleVerify])

  if (phase === 'checking') {
    return (
      <div style={containerStyle}>
        <div style={glowStyle} />
        <Loader2 size={28} color="var(--gold-400)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{
          fontFamily: "'Manrope', sans-serif",
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
          fontWeight: 500,
          marginTop: 16,
        }}>
          Проверка сессии...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Ambient gold glow */}
      <div style={glowStyle} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        style={{
          maxWidth: 340,
          width: '100%',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Back button */}
        <motion.button
          type="button"
          onClick={onBack}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'absolute',
            top: -80,
            left: 0,
            padding: '7px 12px',
            borderRadius: 12,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-strong)',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <ArrowLeft size={13} />
          Назад
        </motion.button>

        {/* Icon — gold glass */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--gold-glass-medium), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 32px -8px rgba(212,175,55,0.2)',
        }}>
          <Shield size={24} color="var(--gold-400)" strokeWidth={1.5} />
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22, fontWeight: 700, fontStyle: 'italic',
          color: 'var(--text-primary)',
          marginBottom: 8, letterSpacing: '-0.01em',
        }}>
          Подтверждение
        </h1>

        <p style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 13, color: 'rgba(255,255,255,0.35)',
          textAlign: 'center', lineHeight: 1.55, marginBottom: 28,
          maxWidth: 260, fontWeight: 500,
        }}>
          {phase === 'send'
            ? 'Для доступа к God Mode отправим 6-значный код в Telegram'
            : 'Введите код из сообщения в Telegram'}
        </p>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#f87171',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 12, fontWeight: 600,
              marginBottom: 16, textAlign: 'center',
            }}
          >
            {error}
          </motion.div>
        )}

        {phase === 'send' ? (
          /* Send code button */
          <motion.button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '15px 24px', borderRadius: 16,
              background: 'var(--gold-metallic)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: 'var(--text-on-gold)',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px -4px rgba(212,175,55,0.3)',
            }}
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Send size={16} />
            )}
            Отправить код
          </motion.button>
        ) : (
          /* Code input */
          <>
            {/* Glass card wrapper */}
            <div style={{
              width: '100%',
              padding: '20px 16px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--surface-hover)',
              marginBottom: 16,
            }}>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                style={{
                  width: '100%', padding: '14px 16px',
                  borderRadius: 14, fontSize: 26, fontWeight: 700,
                  textAlign: 'center', letterSpacing: '0.3em',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.2)' : 'var(--gold-glass-medium)'}`,
                  color: 'var(--gold-400)', outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  caretColor: 'var(--gold-400)',
                }}
              />

              {/* Digit indicators */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 8,
                marginTop: 12,
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 4,
                    background: i < code.length ? 'var(--gold-400)' : 'var(--border-strong)',
                    transition: 'background 0.15s ease',
                    boxShadow: i < code.length ? '0 0 6px rgba(212,175,55,0.3)' : 'none',
                  }} />
                ))}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 16,
                background: code.length === 6
                  ? 'var(--gold-metallic)'
                  : 'var(--bg-glass)',
                border: code.length === 6
                  ? '1px solid rgba(212,175,55,0.4)'
                  : '1px solid var(--border-strong)',
                color: code.length === 6 ? 'var(--text-on-gold)' : 'rgba(255,255,255,0.2)',
                fontFamily: "'Manrope', sans-serif",
                fontSize: 14, fontWeight: 700,
                cursor: loading || code.length !== 6 ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 16,
                boxShadow: code.length === 6 ? '0 8px 24px -4px rgba(212,175,55,0.3)' : 'none',
              }}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                'Подтвердить'
              )}
            </motion.button>

            {/* Resend */}
            <button
              type="button"
              onClick={handleSendCode}
              disabled={cooldown > 0 || loading}
              style={{
                background: 'none', border: 'none',
                fontFamily: "'Manrope', sans-serif",
                color: cooldown > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(212,175,55,0.5)',
                fontSize: 12, fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer',
              }}
            >
              {cooldown > 0 ? `Отправить повторно (${cooldown}с)` : 'Отправить код повторно'}
            </button>
          </>
        )}
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--bg-void)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  overflow: 'hidden',
}

const glowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-20%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '140%',
  height: '50%',
  background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.06) 0%, transparent 70%)',
  pointerEvents: 'none',
}

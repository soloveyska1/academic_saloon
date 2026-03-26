import { memo, useState, useEffect, useMemo } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

/**
 * SessionCountdown — Dynamic countdown to the nearest academic deadline.
 *
 * Shows the days/hours until the next session period starts.
 * Russian universities have two main session periods:
 *   - Winter session: ~Jan 10 – Jan 31
 *   - Summer session: ~Jun 1 – Jun 30
 *
 * Before each session there's a "hot" pre-session period (~3 weeks)
 * where students panic-order coursework and reports.
 *
 * The component adapts its message based on distance to deadline:
 *   - > 30 days:  hidden (not relevant)
 *   - 14–30 days: "До сессии X дней — успейте заказать"
 *   - 3–14 days:  urgent amber glow
 *   - 0–3 days:   critical pulsing
 */

interface SessionCountdownProps {
  onAction: () => void
}

function getNextDeadline(): { label: string; date: Date } | null {
  const now = new Date()
  const y = now.getFullYear()

  // Key academic deadlines (last day to comfortably order work)
  const deadlines = [
    { label: 'зимней сессии', date: new Date(y, 0, 10) },     // Jan 10
    { label: 'весенней сдачи', date: new Date(y, 2, 20) },    // Mar 20
    { label: 'летней сессии', date: new Date(y, 5, 1) },      // Jun 1
    { label: 'осенней пересдачи', date: new Date(y, 8, 15) }, // Sep 15
    { label: 'зимней сессии', date: new Date(y, 11, 15) },    // Dec 15
    // Next year's first deadline
    { label: 'зимней сессии', date: new Date(y + 1, 0, 10) },
  ]

  for (const d of deadlines) {
    const diff = d.date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days >= 0 && days <= 45) return d
  }
  return null
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return `${n} дней`
  if (last === 1) return `${n} день`
  if (last >= 2 && last <= 4) return `${n} дня`
  return `${n} дней`
}

export const SessionCountdown = memo(function SessionCountdown({ onAction }: SessionCountdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [now, setNow] = useState(() => Date.now())

  // Tick every minute
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const deadline = useMemo(() => getNextDeadline(), [now]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!deadline) return null

  const diffMs = deadline.date.getTime() - now
  const totalDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const isCritical = totalDays <= 3
  const isUrgent = totalDays <= 14

  const goldBase = 'rgba(212,175,55,'
  const borderColor = isCritical
    ? 'rgba(239,68,68,0.25)'
    : isUrgent
      ? `${goldBase}0.20)`
      : `${goldBase}0.10)`

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 16 }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onAction}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          border: `1px solid ${borderColor}`,
          background: isCritical
            ? 'linear-gradient(160deg, rgba(40,12,12,0.95) 0%, rgba(12,10,10,0.98) 100%)'
            : 'linear-gradient(160deg, rgba(22,18,10,0.95) 0%, rgba(10,10,11,0.98) 100%)',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden',
        }}
      >
        {/* Pulsing glow for critical */}
        {isCritical && (
          <motion.div
            aria-hidden="true"
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 14,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.15), transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isCritical ? 'rgba(239,68,68,0.10)' : `${goldBase}0.08)`,
          border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : `${goldBase}0.10)`}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isCritical
            ? <AlertTriangle size={18} color="#ef4444" strokeWidth={1.8} />
            : <Clock size={18} color="var(--gold-400, #D4AF37)" strokeWidth={1.8} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: isCritical ? '#ef4444' : 'var(--gold-300, #D4AF37)',
            lineHeight: 1.3,
          }}>
            {totalDays === 0
              ? 'Сессия уже началась!'
              : `До ${deadline.label} — ${pluralDays(totalDays)}`
            }
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-muted, rgba(255,255,255,0.45))',
            marginTop: 2,
          }}>
            {totalDays <= 3
              ? 'Срочный заказ ещё возможен'
              : totalDays <= 14
                ? 'Самое время оформить заказ'
                : 'Закажите заранее — дешевле и спокойнее'
            }
          </div>
        </div>

        {/* Days counter badge */}
        <div style={{
          flexShrink: 0,
          minWidth: 40,
          textAlign: 'center',
          padding: '6px 10px',
          borderRadius: 8,
          background: isCritical
            ? 'rgba(239,68,68,0.12)'
            : `${goldBase}0.08)`,
          border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : `${goldBase}0.10)`}`,
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            color: isCritical ? '#ef4444' : 'var(--gold-400, #D4AF37)',
          }}>
            {totalDays}
          </div>
          <div style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isCritical ? 'rgba(239,68,68,0.60)' : `${goldBase}0.50)`,
            marginTop: 1,
          }}>
            {totalDays === 1 ? 'день' : 'дней'}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
})

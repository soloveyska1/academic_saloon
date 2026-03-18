import { memo, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, Clock, Zap, Snowflake, Sun } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  EXAM SEASON BANNER — Contextual info banner during exam periods
//  Shows urgency messaging during winter (Jan) and summer (May-Jun) sessions
//  INFO ONLY — No competing CTAs, just awareness
// ═══════════════════════════════════════════════════════════════════════════

interface ExamSeasonBannerProps {
  onCreateOrder?: () => void  // Deprecated, kept for backwards compatibility
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

type SeasonType = 'winter' | 'summer' | null

interface SeasonConfig {
  type: SeasonType
  icon: typeof Snowflake | typeof Sun
  title: string
  subtitle: string
  gradient: string
  borderColor: string
  iconColor: string
  urgencyLevel: 'high' | 'peak'
}

function getExamSeason(): SeasonConfig | null {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  const day = now.getDate()

  // Winter session: December 15 - January 31
  if (month === 11 && day >= 15) {
    return {
      type: 'winter',
      icon: Snowflake,
      title: 'Зимняя сессия',
      subtitle: 'Время закрыть задачи до каникул',
      // Gold theme to match app style (not blue!)
      gradient: 'linear-gradient(135deg, var(--gold-glass-subtle) 0%, var(--bg-card) 100%)',
      borderColor: 'var(--gold-glass-strong)',
      iconColor: 'var(--gold-400)',
      urgencyLevel: 'high',
    }
  }

  if (month === 0) {
    // January 1-20: peak urgency
    if (day <= 20) {
      return {
        type: 'winter',
        icon: Snowflake,
        title: 'Горячая пора!',
        subtitle: 'До конца сессии остаются считанные дни',
        gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        iconColor: 'var(--error-text)',
        urgencyLevel: 'peak',
      }
    }
    // January 21-31: still winter session
    return {
      type: 'winter',
      icon: Snowflake,
      title: 'Зимняя сессия',
      subtitle: 'Самое время закрыть долги до февраля',
      // Gold theme to match app style (not blue!)
      gradient: 'linear-gradient(135deg, var(--gold-glass-subtle) 0%, var(--bg-card) 100%)',
      borderColor: 'var(--gold-glass-strong)',
      iconColor: 'var(--gold-400)',
      urgencyLevel: 'high',
    }
  }

  // Summer session: May 1 - June 30
  if (month === 4) {
    // May
    return {
      type: 'summer',
      icon: Sun,
      title: 'Летняя сессия',
      subtitle: 'Подготовьтесь к экзаменам заблаговременно',
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      iconColor: '#fbbf24',
      urgencyLevel: 'high',
    }
  }

  if (month === 5) {
    // June 1-20: peak urgency
    if (day <= 20) {
      return {
        type: 'summer',
        icon: Sun,
        title: 'Финальная неделя',
        subtitle: 'Завершаем сессию — ещё можно успеть',
        gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        iconColor: 'var(--error-text)',
        urgencyLevel: 'peak',
      }
    }
    // June 21-30: still summer session
    return {
      type: 'summer',
      icon: Sun,
      title: 'Летняя сессия',
      subtitle: 'Закрываем задачи до каникул',
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      iconColor: '#fbbf24',
      urgencyLevel: 'high',
    }
  }

  return null
}

export const ExamSeasonBanner = memo(function ExamSeasonBanner({
  // onCreateOrder is deprecated - kept for backwards compatibility
  haptic: _haptic,
}: ExamSeasonBannerProps) {
  const season = useMemo(() => getExamSeason(), [])
  const shouldReduceMotion = useReducedMotion()

  // Don't show if not exam season
  if (!season) return null

  const isPeak = season.urgencyLevel === 'peak'
  const IconComponent = season.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        position: 'relative',
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 14,
        background: season.gradient,
        border: `1px solid ${season.borderColor}`,
        boxShadow: isPeak
          ? '0 4px 16px rgba(239, 68, 68, 0.12)'
          : '0 2px 12px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Animated background for peak urgency - respects reduced motion */}
      {isPeak && !shouldReduceMotion && (
        <motion.div
          animate={{ opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(239, 68, 68, 0.15), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content row - info only, no CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${season.iconColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${season.iconColor}30`,
            flexShrink: 0,
          }}
        >
          {isPeak ? (
            <Zap size={20} color={season.iconColor} strokeWidth={1.5} fill={`${season.iconColor}30`} />
          ) : (
            <IconComponent size={20} color={season.iconColor} strokeWidth={1.5} />
          )}
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 2,
            }}
          >
            <GraduationCap size={13} color={season.iconColor} strokeWidth={1.5} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: season.iconColor,
              }}
            >
              {season.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={10} color="var(--text-muted)" strokeWidth={1.5} />
            {season.subtitle}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

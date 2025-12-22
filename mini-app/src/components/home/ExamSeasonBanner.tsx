import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Clock, Zap, ArrowRight, Snowflake, Sun } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  EXAM SEASON BANNER — Contextual banner during exam periods
//  Shows urgency messaging during winter (Jan) and summer (May-Jun) sessions
// ═══════════════════════════════════════════════════════════════════════════

interface ExamSeasonBannerProps {
  onCreateOrder: () => void
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
      subtitle: 'Успей сдать до каникул!',
      gradient: 'linear-gradient(135deg, rgba(96, 165, 250, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
      iconColor: '#60a5fa',
      urgencyLevel: 'high',
    }
  }

  if (month === 0) {
    // January 1-20: peak urgency
    if (day <= 20) {
      return {
        type: 'winter',
        icon: Snowflake,
        title: '🔥 Горячая пора!',
        subtitle: 'Осталось мало времени до конца сессии',
        gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        iconColor: '#f87171',
        urgencyLevel: 'peak',
      }
    }
    // January 21-31: still winter session
    return {
      type: 'winter',
      icon: Snowflake,
      title: 'Зимняя сессия',
      subtitle: 'Закрой хвосты до февраля',
      gradient: 'linear-gradient(135deg, rgba(96, 165, 250, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
      iconColor: '#60a5fa',
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
      subtitle: 'Подготовься к экзаменам заранее',
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
        title: '🔥 Финальный рывок!',
        subtitle: 'Последние дни сессии',
        gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        iconColor: '#f87171',
        urgencyLevel: 'peak',
      }
    }
    // June 21-30: still summer session
    return {
      type: 'summer',
      icon: Sun,
      title: 'Летняя сессия',
      subtitle: 'Успей закрыть до каникул!',
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      iconColor: '#fbbf24',
      urgencyLevel: 'high',
    }
  }

  return null
}

export const ExamSeasonBanner = memo(function ExamSeasonBanner({
  onCreateOrder,
  haptic,
}: ExamSeasonBannerProps) {
  const season = useMemo(() => getExamSeason(), [])

  // Don't show if not exam season
  if (!season) return null

  const isPeak = season.urgencyLevel === 'peak'
  const IconComponent = season.icon

  const handleClick = () => {
    haptic?.('medium')
    onCreateOrder()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        marginBottom: 16,
        padding: '16px 18px',
        borderRadius: 16,
        cursor: 'pointer',
        background: season.gradient,
        border: `1px solid ${season.borderColor}`,
        boxShadow: isPeak
          ? '0 4px 20px rgba(239, 68, 68, 0.15)'
          : '0 4px 16px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Animated background for peak urgency */}
      {isPeak && (
        <motion.div
          animate={{
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(239, 68, 68, 0.2), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left side - Content */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Icon */}
            <motion.div
              animate={isPeak ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${season.iconColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${season.iconColor}40`,
              }}
            >
              {isPeak ? (
                <Zap size={22} color={season.iconColor} strokeWidth={2} fill={`${season.iconColor}40`} />
              ) : (
                <IconComponent size={22} color={season.iconColor} strokeWidth={2} />
              )}
            </motion.div>

            {/* Text */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <GraduationCap size={14} color={season.iconColor} strokeWidth={2} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: season.iconColor,
                  }}
                >
                  {season.title}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Clock size={11} color="var(--text-muted)" strokeWidth={2} />
                {season.subtitle}
              </div>
            </div>
          </div>

          {/* Right side - CTA */}
          <motion.div
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              background: isPeak
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)'
                : `${season.iconColor}20`,
              borderRadius: 10,
              border: `1px solid ${isPeak ? 'rgba(239, 68, 68, 0.3)' : `${season.iconColor}40`}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: season.iconColor,
              }}
            >
              Заказать
            </span>
            <ArrowRight size={14} color={season.iconColor} strokeWidth={2} />
          </motion.div>
        </div>

        {/* Stats row for peak urgency */}
        {isPeak && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.3 }}
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Срочные работы от <strong style={{ color: '#fca5a5' }}>24ч</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Гарантия <strong style={{ color: '#fca5a5' }}>сдачи</strong>
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
})

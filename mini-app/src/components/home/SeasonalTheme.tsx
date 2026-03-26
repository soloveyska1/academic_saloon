import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Snowflake, Sun, BookOpen, Leaf, GraduationCap, ArrowRight } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export interface SeasonTheme {
  id: string
  name: string
  icon: LucideIcon
  bannerText: string
  bannerSubtext: string
  ctaText?: string
}

function getCurrentSeason(): SeasonTheme | null {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // New Year: Dec 15 - Jan 15
  if ((month === 12 && day >= 15) || (month === 1 && day <= 15)) {
    return {
      id: 'newyear',
      name: 'Новый год',
      icon: Snowflake,
      bannerText: 'С Новым годом!',
      bannerSubtext: 'Подготовьтесь к сессии заранее',
      ctaText: 'Заказать со скидкой',
    }
  }

  // Winter session: Jan 16 - Feb 15
  if ((month === 1 && day > 15) || (month === 2 && day <= 15)) {
    return {
      id: 'winter-session',
      name: 'Зимняя сессия',
      icon: BookOpen,
      bannerText: 'Зимняя сессия',
      bannerSubtext: 'Завершите работы до конца сессии',
      ctaText: 'Оформить заказ',
    }
  }

  // Summer session: May - Jun
  if (month >= 5 && month <= 6) {
    return {
      id: 'summer-session',
      name: 'Летняя сессия',
      icon: GraduationCap,
      bannerText: 'Летняя сессия',
      bannerSubtext: 'Дипломы и курсовые — оптимальное время для заказа',
      ctaText: 'Оформить заказ',
    }
  }

  // Back to school: Sep
  if (month === 9) {
    return {
      id: 'september',
      name: 'Новый семестр',
      icon: BookOpen,
      bannerText: 'Новый семестр',
      bannerSubtext: 'Начните с чистого листа',
      ctaText: 'Заказать работу',
    }
  }

  // Autumn: Oct - Nov
  if (month >= 10 && month <= 11) {
    return {
      id: 'autumn',
      name: 'Осенний семестр',
      icon: Leaf,
      bannerText: 'Осенний семестр',
      bannerSubtext: 'Курсовые и рефераты — выгодные условия',
    }
  }

  // Summer: Jul - Aug
  if (month >= 7 && month <= 8) {
    return {
      id: 'summer',
      name: 'Лето',
      icon: Sun,
      bannerText: 'Летние каникулы',
      bannerSubtext: 'Подготовьтесь к новому семестру',
    }
  }

  // Spring: Mar - Apr
  if (month >= 3 && month <= 4) {
    return {
      id: 'spring',
      name: 'Весенний семестр',
      icon: BookOpen,
      bannerText: 'Весенний семестр',
      bannerSubtext: 'Курсовые и дипломы — время оформлять заказ',
      ctaText: 'Оформить заказ',
    }
  }

  return null // early Dec — no banner
}

export function useSeasonalTheme(): SeasonTheme | null {
  return useMemo(() => getCurrentSeason(), [])
}

interface SeasonalBannerProps {
  onAction?: () => void
}

export const SeasonalBanner = memo(function SeasonalBanner({ onAction }: SeasonalBannerProps) {
  const theme = useSeasonalTheme()

  if (!theme) return null

  const Icon = theme.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onAction}
      role={onAction ? 'button' : undefined}
      tabIndex={onAction ? 0 : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        padding: '14px 16px',
        background: 'var(--gold-glass-subtle)',
        border: '1px solid rgba(212,175,55,0.12)',
        cursor: onAction ? 'pointer' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--gold-glass-medium)',
        border: '1px solid rgba(212,175,55,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={17} strokeWidth={1.8} color="var(--gold-400)" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--gold-300)',
          lineHeight: 1.3,
        }}>
          {theme.bannerText}
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          lineHeight: 1.3,
        }}>
          {theme.bannerSubtext}
        </div>
      </div>

      {/* Arrow (if actionable) */}
      {onAction && theme.ctaText && (
        <ArrowRight size={14} strokeWidth={2} color="var(--gold-400)" style={{ opacity: 0.4, flexShrink: 0 }} />
      )}
    </motion.div>
  )
})

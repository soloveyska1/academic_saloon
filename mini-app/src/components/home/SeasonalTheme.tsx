import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

export interface SeasonTheme {
  id: string
  name: string
  accent: string
  accentGlow: string
  particleEmoji: string
  bannerText: string
  bannerSubtext: string
}

function getCurrentSeason(): SeasonTheme {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // New Year / Christmas: Dec 15 - Jan 15
  if ((month === 12 && day >= 15) || (month === 1 && day <= 15)) {
    return {
      id: 'newyear',
      name: 'Новый год',
      accent: 'rgba(59, 130, 246, 0.8)',
      accentGlow: 'rgba(59, 130, 246, 0.15)',
      particleEmoji: '❄️',
      bannerText: 'С Новым годом! 🎄',
      bannerSubtext: 'Скидка 15% на первый заказ в новом году',
    }
  }

  // Winter session: Jan 16 - Feb 15
  if ((month === 1 && day > 15) || (month === 2 && day <= 15)) {
    return {
      id: 'winter-session',
      name: 'Зимняя сессия',
      accent: 'rgba(239, 68, 68, 0.8)',
      accentGlow: 'rgba(239, 68, 68, 0.15)',
      particleEmoji: '🔥',
      bannerText: 'Зимняя сессия',
      bannerSubtext: 'Успейте сдать всё вовремя',
    }
  }

  // Spring: Mar - Apr
  if (month >= 3 && month <= 4) {
    return {
      id: 'spring',
      name: 'Весна',
      accent: 'rgba(52, 211, 153, 0.8)',
      accentGlow: 'rgba(52, 211, 153, 0.15)',
      particleEmoji: '🌿',
      bannerText: 'Весенний семестр',
      bannerSubtext: 'Закажите работу заранее — со скидкой',
    }
  }

  // Summer session: May - Jun
  if (month >= 5 && month <= 6) {
    return {
      id: 'summer-session',
      name: 'Летняя сессия',
      accent: 'rgba(251, 146, 60, 0.8)',
      accentGlow: 'rgba(251, 146, 60, 0.15)',
      particleEmoji: '☀️',
      bannerText: 'Летняя сессия',
      bannerSubtext: 'Защита дипломов — не откладывайте!',
    }
  }

  // Summer: Jul - Aug
  if (month >= 7 && month <= 8) {
    return {
      id: 'summer',
      name: 'Лето',
      accent: 'rgba(34, 197, 94, 0.8)',
      accentGlow: 'rgba(34, 197, 94, 0.15)',
      particleEmoji: '🏖️',
      bannerText: 'Летние каникулы',
      bannerSubtext: 'Подготовьтесь к новому семестру',
    }
  }

  // Back to school: Sep
  if (month === 9) {
    return {
      id: 'september',
      name: 'Новый учебный год',
      accent: 'rgba(99, 102, 241, 0.8)',
      accentGlow: 'rgba(99, 102, 241, 0.15)',
      particleEmoji: '📚',
      bannerText: 'Новый семестр!',
      bannerSubtext: 'Начните с чистого листа',
    }
  }

  // Autumn: Oct - Nov
  if (month >= 10 && month <= 11) {
    return {
      id: 'autumn',
      name: 'Осень',
      accent: 'rgba(245, 158, 11, 0.8)',
      accentGlow: 'rgba(245, 158, 11, 0.15)',
      particleEmoji: '🍂',
      bannerText: 'Осенний семестр',
      bannerSubtext: 'Сдайте работы вовремя',
    }
  }

  // Default: Dec 1-14
  return {
    id: 'default',
    name: 'Золотой сезон',
    accent: 'rgba(212,175,55,0.8)',
    accentGlow: 'rgba(212,175,55,0.15)',
    particleEmoji: '✨',
    bannerText: 'Академический Салон',
    bannerSubtext: 'Качество. Точно в срок.',
  }
}

export function useSeasonalTheme(): SeasonTheme {
  return useMemo(() => getCurrentSeason(), [])
}

interface SeasonalBannerProps {
  onAction?: () => void
}

export const SeasonalBanner = memo(function SeasonalBanner({ onAction }: SeasonalBannerProps) {
  const theme = useSeasonalTheme()

  // Don't show default banner
  if (theme.id === 'default') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      onClick={onAction}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 10,
        padding: '12px 14px',
        background: theme.accentGlow.replace(/[\d.]+\)$/, '0.06)'),
        border: `1px solid ${theme.accent.replace(/[\d.]+\)$/, '0.12)')}`,
        cursor: onAction ? 'pointer' : undefined,
      }}
    >
      {/* Floating particle */}
      <motion.span
        animate={{ y: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          fontSize: 20,
          pointerEvents: 'none',
        }}
      >
        {theme.particleEmoji}
      </motion.span>

      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: theme.accent,
        marginBottom: 2,
      }}>
        {theme.bannerText}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        maxWidth: '85%',
      }}>
        {theme.bannerSubtext}
      </div>
    </motion.div>
  )
})

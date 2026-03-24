import { useEffect } from 'react'

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night'

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

const periodStyles: Record<TimePeriod, Record<string, string>> = {
  morning: {
    // Neutral — no adjustment, use default CSS variables
  },
  afternoon: {
    // Slightly cool blue tint
    '--bg-void': '#0A0A0C',
    '--bg-card-warmth': 'rgba(12, 13, 16, 0.95)',
  },
  evening: {
    // Warm amber tint
    '--bg-void': '#0C0A08',
    '--bg-card-warmth': 'rgba(20, 16, 10, 0.95)',
  },
  night: {
    // Deep warm
    '--bg-void': '#0A0806',
    '--bg-card-warmth': 'rgba(18, 14, 8, 0.95)',
  },
}

// All custom property names we may set, so we can clean them up
const allProperties = ['--bg-void', '--bg-card-warmth']

function applyPeriodStyles(period: TimePeriod) {
  const root = document.documentElement
  const styles = periodStyles[period]

  // Reset all properties first
  for (const prop of allProperties) {
    root.style.removeProperty(prop)
  }

  // Apply current period styles
  for (const [prop, value] of Object.entries(styles)) {
    root.style.setProperty(prop, value)
  }

  // Ensure smooth background transition on body
  document.body.style.transition = 'background-color 2s ease'
}

export function useAdaptiveDarkMode() {
  useEffect(() => {
    // Apply immediately
    const hour = new Date().getHours()
    applyPeriodStyles(getTimePeriod(hour))

    // Update every 30 minutes
    const interval = setInterval(() => {
      const currentHour = new Date().getHours()
      applyPeriodStyles(getTimePeriod(currentHour))
    }, 30 * 60 * 1000)

    return () => {
      clearInterval(interval)

      // Clean up: remove all custom properties we set
      const root = document.documentElement
      for (const prop of allProperties) {
        root.style.removeProperty(prop)
      }
      document.body.style.removeProperty('transition')
    }
  }, [])
}

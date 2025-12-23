import { useState, useEffect, useMemo, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  SOCIAL PROOF SYSTEM — Умная генерация убедительных метрик
//
//  Принципы:
//  1. Цифры seed-based (стабильные для каждой услуги)
//  2. "Живые" показатели обновляются в реальном времени
//  3. Логическая связь: premium = больше заказов, выше рейтинг
//  4. Реалистичные неокруглённые числа (847, не 850)
// ═══════════════════════════════════════════════════════════════════════════

export interface SocialProofData {
  // Статические (seed-based)
  rating: number           // 4.5 - 5.0
  totalOrders: number      // 100 - 2000+
  completionRate: number   // 95 - 99%

  // Динамические (обновляются)
  viewersNow: number       // 1 - 15 человек смотрят
  ordersToday: number      // 0 - 20 заказов сегодня
  lastOrderAgo: string     // "5 мин назад", "2 часа назад"
}

// Seed-based pseudo-random для стабильных значений
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return () => {
    hash = Math.sin(hash) * 10000
    return hash - Math.floor(hash)
  }
}

// Генерация реалистичного неокруглённого числа
function realisticNumber(min: number, max: number, random: () => number): number {
  const base = Math.floor(min + random() * (max - min))
  // Добавляем "хвост" для реалистичности (не круглые числа)
  const tail = Math.floor(random() * 10)
  return base - (base % 10) + tail
}

// Базовые метрики по категориям услуг
const CATEGORY_MULTIPLIERS = {
  premium: {
    ordersBase: [800, 2500],
    ratingBase: [4.7, 4.95],
    viewersMultiplier: 1.5,
    ordersPerDay: [3, 12],
  },
  standard: {
    ordersBase: [400, 1200],
    ratingBase: [4.5, 4.85],
    viewersMultiplier: 1.2,
    ordersPerDay: [5, 15],
  },
  express: {
    ordersBase: [200, 800],
    ratingBase: [4.4, 4.8],
    viewersMultiplier: 1.0,
    ordersPerDay: [8, 25],
  },
}

// Популярные услуги получают буст
const POPULAR_BOOST = {
  ordersMultiplier: 1.4,
  viewersMultiplier: 1.8,
}

export interface ServiceMetaForProof {
  id: string
  category: 'premium' | 'standard' | 'express'
  popular?: boolean
}

// Генерация статических метрик (seed-based, не меняются)
export function generateStaticProof(service: ServiceMetaForProof): Pick<SocialProofData, 'rating' | 'totalOrders' | 'completionRate'> {
  const random = seededRandom(service.id + '_social_v2')
  const multipliers = CATEGORY_MULTIPLIERS[service.category]

  // Базовые заказы
  let totalOrders = realisticNumber(
    multipliers.ordersBase[0],
    multipliers.ordersBase[1],
    random
  )

  // Буст для популярных
  if (service.popular) {
    totalOrders = Math.floor(totalOrders * POPULAR_BOOST.ordersMultiplier)
  }

  // Рейтинг с реалистичной точностью (4.7, 4.85, 4.9)
  const ratingRaw = multipliers.ratingBase[0] +
    random() * (multipliers.ratingBase[1] - multipliers.ratingBase[0])
  const rating = Math.round(ratingRaw * 10) / 10

  // Completion rate 95-99%
  const completionRate = 95 + Math.floor(random() * 5)

  return { rating, totalOrders, completionRate }
}

// Генерация динамических метрик (обновляются периодически)
function generateDynamicProof(
  service: ServiceMetaForProof,
  timeOffset: number = 0
): Pick<SocialProofData, 'viewersNow' | 'ordersToday' | 'lastOrderAgo'> {
  // Используем текущее время + offset для вариативности
  const now = Date.now() + timeOffset
  const hourOfDay = new Date(now).getHours()

  // Сид меняется каждые 30 секунд для "живости"
  const timeSeed = Math.floor(now / 30000)
  const random = seededRandom(service.id + '_dynamic_' + timeSeed)

  const multipliers = CATEGORY_MULTIPLIERS[service.category]

  // Viewers: зависит от времени суток (пик 18-23, минимум 3-7)
  let baseViewers = 2 + Math.floor(random() * 6)

  // Дневной/ночной коэффициент
  const hourMultiplier = hourOfDay >= 10 && hourOfDay <= 23
    ? 1 + (Math.sin((hourOfDay - 10) / 13 * Math.PI) * 0.8)
    : 0.3

  baseViewers = Math.max(1, Math.floor(baseViewers * hourMultiplier * multipliers.viewersMultiplier))

  if (service.popular) {
    baseViewers = Math.floor(baseViewers * POPULAR_BOOST.viewersMultiplier)
  }

  const viewersNow = Math.min(baseViewers, 19) // Макс 19 чтобы не выглядело fake

  // Orders today
  const dayProgress = hourOfDay / 24
  const [minOrders, maxOrders] = multipliers.ordersPerDay
  const ordersToday = Math.floor(
    (minOrders + random() * (maxOrders - minOrders)) * dayProgress
  )

  // Last order ago
  const lastOrderMinutes = Math.floor(random() * 180) + 5 // 5 мин - 3 часа
  const lastOrderAgo = formatTimeAgo(lastOrderMinutes)

  return { viewersNow, ordersToday, lastOrderAgo }
}

function formatTimeAgo(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин назад`
  }
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 час назад'
  if (hours < 5) return `${hours} часа назад`
  return `${hours} часов назад`
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Хук для одной услуги
export function useSocialProof(service: ServiceMetaForProof): SocialProofData {
  // Статические метрики - вычисляются один раз
  const staticProof = useMemo(() => generateStaticProof(service), [service.id])

  // Динамические метрики - обновляются каждые 30 сек
  const [dynamicProof, setDynamicProof] = useState(() => generateDynamicProof(service))

  useEffect(() => {
    const interval = setInterval(() => {
      setDynamicProof(generateDynamicProof(service))
    }, 30000)

    return () => clearInterval(interval)
  }, [service.id])

  return { ...staticProof, ...dynamicProof }
}

// Хук для всех услуг (оптимизированный)
export function useSocialProofBatch(
  services: ServiceMetaForProof[]
): Map<string, SocialProofData> {
  // Статические метрики
  const staticProofs = useMemo(() => {
    const map = new Map<string, Pick<SocialProofData, 'rating' | 'totalOrders' | 'completionRate'>>()
    services.forEach(service => {
      map.set(service.id, generateStaticProof(service))
    })
    return map
  }, [services.map(s => s.id).join(',')])

  // Динамические метрики
  const [dynamicProofs, setDynamicProofs] = useState<Map<string, Pick<SocialProofData, 'viewersNow' | 'ordersToday' | 'lastOrderAgo'>>>(() => {
    const map = new Map()
    services.forEach(service => {
      map.set(service.id, generateDynamicProof(service))
    })
    return map
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const newMap = new Map()
      services.forEach(service => {
        newMap.set(service.id, generateDynamicProof(service))
      })
      setDynamicProofs(newMap)
    }, 30000)

    return () => clearInterval(interval)
  }, [services.map(s => s.id).join(',')])

  // Комбинируем
  return useMemo(() => {
    const combined = new Map<string, SocialProofData>()
    services.forEach(service => {
      const staticData = staticProofs.get(service.id)!
      const dynamicData = dynamicProofs.get(service.id)!
      combined.set(service.id, { ...staticData, ...dynamicData })
    })
    return combined
  }, [staticProofs, dynamicProofs])
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER — Плавная анимация изменения чисел
// ═══════════════════════════════════════════════════════════════════════════

export function useAnimatedNumber(value: number, duration: number = 500): number {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const startValue = displayValue
    const diff = value - startValue
    if (diff === 0) return

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayValue(Math.round(startValue + diff * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return displayValue
}

// Форматирование больших чисел
export function formatOrderCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace('.0', '') + 'k+'
  }
  return count.toString()
}

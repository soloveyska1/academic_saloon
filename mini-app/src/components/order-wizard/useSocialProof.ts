import { useState, useEffect, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  SOCIAL PROOF SYSTEM — Умная генерация убедительных метрик
//
//  Принципы:
//  1. Цифры seed-based (стабильные для каждой услуги)
//  2. "Живые" показатели обновляются в реальном времени
//  3. Логическая связь: premium = больше заказов, выше рейтинг
//  4. Реалистичные неокруглённые числа (847, не 850)
//  5. Медленные переходы (60-120 сек) — не мельтешит
//  6. Разнообразные данные: ВУЗы, имена, предметы, форматы
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

  // Лента активности (живые события)
  recentActivity: ActivityEvent | null
}

export interface ActivityEvent {
  type: 'order' | 'review' | 'delivery'
  text: string
  timeAgo: string
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

// ═══════════════════════════════════════════════════════════════════════════
//  ДАННЫЕ ДЛЯ РАЗНООБРАЗИЯ
// ═══════════════════════════════════════════════════════════════════════════

const UNIVERSITIES = [
  'МГУ', 'СПбГУ', 'ВШЭ', 'МГТУ', 'РЭУ', 'РУДН', 'МФТИ',
  'МГИМО', 'РАНХиГС', 'ИТМО', 'ФУ при Правительстве',
  'ГУУ', 'МАИ', 'МИРЭА', 'Финансовый университет',
  'МПГУ', 'РГГУ', 'НГТУ', 'УрФУ', 'КФУ',
  'ТГУ', 'НГУ', 'ЮФУ', 'СамГТУ', 'ОмГУ',
]

const FIRST_NAMES = [
  'Алексей', 'Дмитрий', 'Анна', 'Мария', 'Иван',
  'Елена', 'Сергей', 'Ольга', 'Андрей', 'Екатерина',
  'Михаил', 'Наталья', 'Артём', 'Юлия', 'Максим',
  'Виктория', 'Даниил', 'Полина', 'Кирилл', 'София',
  'Никита', 'Дарья', 'Роман', 'Алина', 'Владислав',
  'Александра', 'Тимур', 'Валерия', 'Егор', 'Ксения',
]

const SUBJECTS = [
  'Экономика', 'Менеджмент', 'Маркетинг', 'Финансы', 'Бухучёт',
  'Юриспруденция', 'Психология', 'Социология', 'Политология', 'Философия',
  'Информатика', 'Программирование', 'Математика', 'Статистика', 'Физика',
  'Логистика', 'ГМУ', 'Педагогика', 'Культурология', 'Экология',
  'История', 'Литература', 'Английский язык', 'Химия', 'Биология',
  'Банковское дело', 'Страхование', 'Медицина', 'Архитектура', 'Дизайн',
]

const WORK_TYPE_LABELS: Record<string, string[]> = {
  masters: ['магистерскую диссертацию', 'диссертацию'],
  diploma: ['дипломную работу', 'ВКР', 'дипломный проект'],
  coursework: ['курсовую работу', 'курсовую'],
  practice: ['отчёт по практике', 'практику'],
  essay: ['эссе'],
  presentation: ['презентацию', 'слайды'],
  control: ['контрольную работу', 'контрольную'],
  independent: ['самостоятельную работу'],
  report: ['реферат'],
  photo_task: ['задачу по фото'],
  other: ['работу'],
}

const REVIEW_TEXTS = [
  'Всё сделали вовремя, спасибо!',
  'Качество отличное, преподаватель принял',
  'Быстро и чётко, рекомендую',
  'Сдал на отлично, ещё обращусь',
  'Хорошая работа, без замечаний',
  'Спасибо за оперативность!',
  'Преподаватель доволен, 5 баллов',
  'Сделали даже лучше, чем ожидал',
  'Рекомендую, всё по делу',
  'Уже третий раз заказываю, доволен',
  'Защитился благодаря вам',
  'Быстро, качественно, без правок',
  'Оформление идеальное, по ГОСТу',
  'Автор разобрался в теме, впечатлён',
  'Работу приняли с первого раза',
]

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

// ── Timing constants ──
// Динамические метрики обновляются каждые 60-90 сек (не 30!)
const DYNAMIC_INTERVAL_MS = 75_000  // 75 секунд — золотая середина
const ACTIVITY_INTERVAL_MS = 90_000 // 90 секунд — лента событий
const DYNAMIC_SEED_PERIOD = 90_000  // Сид меняется каждые 90 сек

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

  // Сид меняется каждые 90 секунд (было 30) — медленнее, реалистичнее
  const timeSeed = Math.floor(now / DYNAMIC_SEED_PERIOD)
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

  // Last order ago — более разнообразно
  const lastOrderMinutes = Math.floor(random() * 240) + 3 // 3 мин - 4 часа
  const lastOrderAgo = formatTimeAgo(lastOrderMinutes)

  return { viewersNow, ordersToday, lastOrderAgo }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ЛЕНТА АКТИВНОСТИ — Реалистичные события
// ═══════════════════════════════════════════════════════════════════════════

function generateActivityEvent(
  service: ServiceMetaForProof,
  index: number
): ActivityEvent {
  const seed = `${service.id}_activity_${Math.floor(Date.now() / ACTIVITY_INTERVAL_MS)}_${index}`
  const random = seededRandom(seed)

  const eventType = random()
  const nameIdx = Math.floor(random() * FIRST_NAMES.length)
  const name = FIRST_NAMES[nameIdx]
  const uniIdx = Math.floor(random() * UNIVERSITIES.length)
  const uni = UNIVERSITIES[uniIdx]
  const subjectIdx = Math.floor(random() * SUBJECTS.length)
  const subject = SUBJECTS[subjectIdx]

  // Выбираем тип работы из доступных для этого сервиса
  const workLabels = WORK_TYPE_LABELS[service.id] || WORK_TYPE_LABELS.other
  const workLabel = workLabels[Math.floor(random() * workLabels.length)]

  // Время: 2-180 мин назад
  const minutesAgo = Math.floor(random() * 178) + 2
  const timeAgo = formatTimeAgo(minutesAgo)

  if (eventType < 0.45) {
    // Новый заказ
    const templates = [
      `${name} заказал(а) ${workLabel} по «${subject}»`,
      `Новый заказ: ${workLabel}, ${subject} (${uni})`,
      `${name} из ${uni} оформил(а) ${workLabel}`,
      `Заказ на ${workLabel}: ${subject}`,
      `Студент ${uni} заказал(а) ${workLabel}`,
    ]
    const text = templates[Math.floor(random() * templates.length)]
    return { type: 'order', text, timeAgo }
  }

  if (eventType < 0.80) {
    // Отзыв
    const reviewIdx = Math.floor(random() * REVIEW_TEXTS.length)
    const review = REVIEW_TEXTS[reviewIdx]
    const ratingStars = random() > 0.3 ? '5.0' : '4.9'
    const text = `${name}: «${review}» — ${ratingStars}`
    return { type: 'review', text, timeAgo }
  }

  // Выполнен заказ
  const templates = [
    `Выполнена ${workLabel} для ${name} (${uni})`,
    `${workLabel} по «${subject}» сдана клиенту`,
    `Готова ${workLabel}: ${subject} — ${uni}`,
  ]
  const text = templates[Math.floor(random() * templates.length)]
  return { type: 'delivery', text, timeAgo }
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

  // Динамические метрики - обновляются каждые 75 сек (было 30)
  const [dynamicProof, setDynamicProof] = useState(() => generateDynamicProof(service))

  // Лента активности
  const [activityIndex, setActivityIndex] = useState(0)
  const activity = useMemo(
    () => generateActivityEvent(service, activityIndex),
    [service.id, activityIndex]
  )

  useEffect(() => {
    const dynamicInterval = setInterval(() => {
      setDynamicProof(generateDynamicProof(service))
    }, DYNAMIC_INTERVAL_MS)

    const activityInterval = setInterval(() => {
      setActivityIndex(prev => prev + 1)
    }, ACTIVITY_INTERVAL_MS)

    return () => {
      clearInterval(dynamicInterval)
      clearInterval(activityInterval)
    }
  }, [service.id])

  return { ...staticProof, ...dynamicProof, recentActivity: activity }
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

  // Activity events
  const [activityIndex, setActivityIndex] = useState(0)

  useEffect(() => {
    const dynamicInterval = setInterval(() => {
      const newMap = new Map()
      services.forEach(service => {
        newMap.set(service.id, generateDynamicProof(service))
      })
      setDynamicProofs(newMap)
    }, DYNAMIC_INTERVAL_MS)

    const activityInterval = setInterval(() => {
      setActivityIndex(prev => prev + 1)
    }, ACTIVITY_INTERVAL_MS)

    return () => {
      clearInterval(dynamicInterval)
      clearInterval(activityInterval)
    }
  }, [services.map(s => s.id).join(',')])

  // Комбинируем
  return useMemo(() => {
    const combined = new Map<string, SocialProofData>()
    services.forEach(service => {
      const staticData = staticProofs.get(service.id)!
      const dynamicData = dynamicProofs.get(service.id)!
      const activity = generateActivityEvent(service, activityIndex)
      combined.set(service.id, { ...staticData, ...dynamicData, recentActivity: activity })
    })
    return combined
  }, [staticProofs, dynamicProofs, activityIndex])
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

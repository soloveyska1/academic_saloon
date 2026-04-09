export interface WorkTypeOption {
  value: string
  base: number
  includedPages: number
  suggestedPages: number
  pageMin: number
  pageMax: number
  extraPageRate: number
  pageLabel: string
  keywords: string[]
}

export const WORK_TYPES: WorkTypeOption[] = [
  {
    value: 'Контрольная работа',
    base: 2500,
    includedPages: 10,
    suggestedPages: 10,
    pageMin: 5,
    pageMax: 40,
    extraPageRate: 90,
    pageLabel: 'обычно 5–15 стр.',
    keywords: ['контроль', 'самостоятель', 'экзамен', 'практическое задание', 'учебная работа'],
  },
  {
    value: 'Реферат',
    base: 3500,
    includedPages: 15,
    suggestedPages: 15,
    pageMin: 8,
    pageMax: 45,
    extraPageRate: 110,
    pageLabel: 'обычно 10–20 стр.',
    keywords: ['реферат', 'конспект', 'учебный материал', 'учебный документ', 'аналитический документ'],
  },
  {
    value: 'Доклад / презентация',
    base: 3000,
    includedPages: 12,
    suggestedPages: 10,
    pageMin: 5,
    pageMax: 30,
    extraPageRate: 80,
    pageLabel: 'обычно 5–12 стр.',
    keywords: ['доклад', 'презентац'],
  },
  {
    value: 'Эссе',
    base: 3200,
    includedPages: 10,
    suggestedPages: 10,
    pageMin: 5,
    pageMax: 30,
    extraPageRate: 100,
    pageLabel: 'обычно 5–12 стр.',
    keywords: ['эссе'],
  },
  {
    value: 'Курсовая работа',
    base: 6800,
    includedPages: 25,
    suggestedPages: 25,
    pageMin: 15,
    pageMax: 60,
    extraPageRate: 170,
    pageLabel: 'обычно 20–35 стр.',
    keywords: ['курсов'],
  },
  {
    value: 'Отчёт по практике',
    base: 8500,
    includedPages: 25,
    suggestedPages: 30,
    pageMin: 15,
    pageMax: 80,
    extraPageRate: 180,
    pageLabel: 'обычно 20–35 стр.',
    keywords: ['практик', 'отчет о научно-практической работе', 'отчёт о научно-практической работе'],
  },
  {
    value: 'ВКР / Дипломная',
    base: 40000,
    includedPages: 55,
    suggestedPages: 65,
    pageMin: 35,
    pageMax: 120,
    extraPageRate: 350,
    pageLabel: 'обычно 50–80 стр.',
    keywords: ['вкр', 'диплом', 'выпускная квалификационная работа'],
  },
  {
    value: 'Магистерская диссертация',
    base: 45000,
    includedPages: 65,
    suggestedPages: 80,
    pageMin: 45,
    pageMax: 150,
    extraPageRate: 380,
    pageLabel: 'обычно 65–100 стр.',
    keywords: ['магист', 'диссертац'],
  },
]

export const DEFAULT_WORK_TYPE = 'Курсовая работа'

export const DEADLINE_OPTIONS = [
  { value: '24 часа', multiplier: 1.75 },
  { value: '3 дня', multiplier: 1.45 },
  { value: '7 дней', multiplier: 1.2 },
  { value: '2 недели', multiplier: 1 },
] as const

export const ORIGINALITY_OPTIONS = [
  { value: 'Базовая', multiplier: 1 },
  { value: 'Повышенная', multiplier: 1.16 },
  { value: 'Максимальная', multiplier: 1.28 },
] as const

function normalizeWorkTypeInput(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
}

export function getWorkTypeMeta(workType?: string) {
  return WORK_TYPES.find((item) => item.value === workType) ?? WORK_TYPES.find((item) => item.value === DEFAULT_WORK_TYPE) ?? WORK_TYPES[0]
}

export function recommendWorkType(sampleType?: string): string {
  const normalized = normalizeWorkTypeInput(sampleType)
  if (!normalized) return DEFAULT_WORK_TYPE

  for (const item of WORK_TYPES) {
    if (item.keywords.some((keyword) => normalized.includes(normalizeWorkTypeInput(keyword)))) {
      return item.value
    }
  }

  return DEFAULT_WORK_TYPE
}

export function estimatePrice(workType: string, pages: number, deadline: string, originality: string) {
  const meta = getWorkTypeMeta(workType)
  const deadlineMultiplier =
    DEADLINE_OPTIONS.find((item) => item.value === deadline)?.multiplier ?? 1
  const originalityMultiplier =
    ORIGINALITY_OPTIONS.find((item) => item.value === originality)?.multiplier ?? 1
  const normalizedPages = Math.max(meta.pageMin, Math.min(meta.pageMax, pages))
  const extraPages = Math.max(0, normalizedPages - meta.includedPages)
  const baseWithVolume = meta.base + extraPages * meta.extraPageRate
  const total = Math.round(baseWithVolume * deadlineMultiplier * originalityMultiplier)

  return {
    total,
    base: meta.base,
    pages: normalizedPages,
    includedPages: meta.includedPages,
    extraPages,
    extraPageRate: meta.extraPageRate,
    deadlineMultiplier,
    originalityMultiplier,
  }
}

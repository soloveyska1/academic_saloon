const ROUTE_SCROLL_KEY = 'bibliosaloon-library-route-scroll'
const ORDER_DRAFT_KEY = 'bibliosaloon-library-order-draft'
const PINNED_TOPICS_KEY = 'bibliosaloon-library-pinned-topics'
const COMPARE_KEYS_KEY = 'bibliosaloon-library-compare-keys'

export interface OrderDraft {
  workType: string
  deadline: string
  originality: string
  pages: number
  topic: string
  contact: string
  contactChannel: string
  goal: string
  notes: string
  extras: string[]
  sampleToken: string
  updatedAt: number
}

export function loadRouteScroll(pathname: string): number | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(ROUTE_SCROLL_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Record<string, number>
    const value = parsed[pathname]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function saveRouteScroll(pathname: string, value: number): void {
  if (typeof window === 'undefined') return

  try {
    const raw = window.sessionStorage.getItem(ROUTE_SCROLL_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    parsed[pathname] = Math.max(0, Math.round(value))
    window.sessionStorage.setItem(ROUTE_SCROLL_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage failures.
  }
}

export function loadOrderDraft(): OrderDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(ORDER_DRAFT_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<OrderDraft>
    if (
      typeof parsed.workType !== 'string' ||
      typeof parsed.deadline !== 'string' ||
      typeof parsed.originality !== 'string' ||
      typeof parsed.pages !== 'number' ||
      typeof parsed.topic !== 'string' ||
      typeof parsed.contact !== 'string' ||
      typeof parsed.contactChannel !== 'string' ||
      (typeof parsed.goal !== 'undefined' && typeof parsed.goal !== 'string') ||
      typeof parsed.notes !== 'string' ||
      !Array.isArray(parsed.extras) ||
      typeof parsed.sampleToken !== 'string' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      window.localStorage.removeItem(ORDER_DRAFT_KEY)
      return null
    }

    return {
      workType: parsed.workType,
      deadline: parsed.deadline,
      originality: parsed.originality,
      pages: parsed.pages,
      topic: parsed.topic,
      contact: parsed.contact,
      contactChannel: parsed.contactChannel,
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
      notes: parsed.notes,
      extras: parsed.extras.filter((item): item is string => typeof item === 'string'),
      sampleToken: parsed.sampleToken,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export function saveOrderDraft(draft: Omit<OrderDraft, 'updatedAt'>): number | null {
  if (typeof window === 'undefined') return null

  try {
    const updatedAt = Date.now()
    window.localStorage.setItem(
      ORDER_DRAFT_KEY,
      JSON.stringify({
        ...draft,
        updatedAt,
      } satisfies OrderDraft),
    )
    return updatedAt
  } catch {
    return null
  }
}

export function clearOrderDraft(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ORDER_DRAFT_KEY)
}

function normalizePinnedTopic(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function loadPinnedTopics(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(PINNED_TOPICS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => normalizePinnedTopic(item))
          .filter(Boolean)
      : []
  } catch {
    return []
  }
}

export function savePinnedTopics(topics: string[]): void {
  if (typeof window === 'undefined') return

  try {
    const normalized = topics.map((item) => normalizePinnedTopic(item)).filter(Boolean)
    window.localStorage.setItem(PINNED_TOPICS_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore storage failures.
  }
}

export function togglePinnedTopic(topics: string[], topic: string, limit = 6): string[] {
  const normalized = normalizePinnedTopic(topic)
  if (!normalized) return topics

  const exists = topics.some((item) => item.toLowerCase() === normalized.toLowerCase())
  if (exists) {
    return topics.filter((item) => item.toLowerCase() !== normalized.toLowerCase())
  }

  return [normalized, ...topics].slice(0, limit)
}

export function loadCompareKeys(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(COMPARE_KEYS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function saveCompareKeys(keys: string[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(COMPARE_KEYS_KEY, JSON.stringify(keys.filter(Boolean)))
  } catch {
    // Ignore storage failures.
  }
}

export function toggleCompareKey(keys: string[], key: string, limit = 4): string[] {
  if (!key.trim()) return keys

  if (keys.includes(key)) {
    return keys.filter((item) => item !== key)
  }

  return [key, ...keys].slice(0, limit)
}

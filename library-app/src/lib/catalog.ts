import { formatRussianCount } from './russian'

export interface CatalogDocument {
  file: string
  filename: string
  size: string
  text: string
  tags: string[]
  category: string
  subject: string
  course: string
  exists: boolean
  title: string
  description: string
  oldFilename: string
  newFilename: string
  catalogTitle: string
  catalogDescription: string
  docType: string
}

const FAVORITES_KEY = 'bibliosaloon-library-favorites'
const RECENTS_KEY = 'bibliosaloon-library-recents'
const SEARCH_HISTORY_KEY = 'bibliosaloon-library-search-history'
const CATALOG_CACHE_KEY = 'bibliosaloon-library-catalog-cache'
const FILE_HANDOFF_KEY = 'bibliosaloon-library-file-handoff'
const FILE_HANDOFF_TTL = 1000 * 60 * 60 * 36

export interface CatalogSyncState {
  source: 'network' | 'cache'
  updatedAt: number | null
  isStale: boolean
}

export interface AppSharePayload {
  title: string
  text?: string
  url: string
}

export type DocumentHandoffMode = 'preview' | 'download'

export interface DocumentHandoffState {
  key: string
  shareToken: string
  title: string
  subject: string
  category: string
  fileLabel: string
  mode: DocumentHandoffMode
  orderRoute: string
  createdAt: number
}

export type DocumentLaunchResult = 'new-tab' | 'download' | 'same-tab'

function resolveSiteOrigin() {
  if (typeof window === 'undefined') return 'https://bibliosaloon.ru'
  return /(^|\.)bibliosaloon\.ru$/.test(window.location.hostname)
    ? window.location.origin
    : 'https://bibliosaloon.ru'
}

function hashDocumentKey(value: string): string {
  let h1 = 0xdeadbeef ^ value.length
  let h2 = 0x41c6ce57 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function trimText(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function normalizeCatalogPayload(payload: CatalogDocument[]): CatalogDocument[] {
  return payload.filter((item) => item.exists !== false)
}

function readCatalogCache(): { documents: CatalogDocument[]; updatedAt: number | null } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { documents?: CatalogDocument[]; updatedAt?: number }
    if (!Array.isArray(parsed.documents)) return null
    return {
      documents: normalizeCatalogPayload(parsed.documents),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
    }
  } catch {
    return null
  }
}

function writeCatalogCache(documents: CatalogDocument[]): number | null {
  if (typeof window === 'undefined') return null
  try {
    const updatedAt = Date.now()
    window.localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({ documents, updatedAt }),
    )
    return updatedAt
  } catch {
    return null
  }
}

export function getCachedCatalogSnapshot():
  | { documents: CatalogDocument[]; sync: CatalogSyncState }
  | null {
  const cached = readCatalogCache()
  if (!cached?.documents.length) return null
  return {
    documents: cached.documents,
    sync: {
      source: 'cache',
      updatedAt: cached.updatedAt,
      isStale: false,
    },
  }
}

export async function fetchCatalog(
  signal?: AbortSignal,
): Promise<{ documents: CatalogDocument[]; sync: CatalogSyncState }> {
  const cached = readCatalogCache()
  const origins =
    typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? [window.location.origin, 'https://bibliosaloon.ru']
      : [resolveSiteOrigin()]
  let lastError: unknown = null

  for (const origin of origins) {
    try {
      const response = await fetch(`${origin}/catalog.json`, { signal })
      if (!response.ok) {
        throw new Error(`Не удалось загрузить каталог (${response.status})`)
      }

      const payload = normalizeCatalogPayload((await response.json()) as CatalogDocument[])
      const updatedAt = writeCatalogCache(payload)
      return {
        documents: payload,
        sync: {
          source: 'network',
          updatedAt,
          isStale: false,
        },
      }
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      lastError = error
    }
  }

  if (cached?.documents.length) {
    return {
      documents: cached.documents,
      sync: {
        source: 'cache',
        updatedAt: cached.updatedAt,
        isStale: true,
      },
    }
  }

  throw lastError
}

export function documentKey(doc: CatalogDocument): string {
  return doc.file || doc.filename || doc.title
}

export function resolveFileUrl(doc: CatalogDocument): string {
  const path = doc.file.replace(/^\/+/, '')
  return new URL(`/${path}`, resolveSiteOrigin()).toString()
}

export function resolveDocumentExtension(doc: CatalogDocument): string {
  const source = doc.filename || doc.file || ''
  const ext = source.split('.').pop()?.trim().toUpperCase()
  if (!ext) return 'DOC'
  if (ext === 'DOCX') return 'DOC'
  return ext
}

export function canPreviewDocument(doc: CatalogDocument): boolean {
  return resolveDocumentExtension(doc) === 'PDF'
}

export function resolveDownloadName(doc: CatalogDocument): string {
  return (doc.filename || doc.oldFilename || doc.newFilename || doc.title || 'document').trim()
}

export function resolveDocumentShareToken(doc: CatalogDocument): string {
  return `d-${hashDocumentKey(documentKey(doc))}`
}

export function resolveDocumentAppUrl(doc: CatalogDocument): string {
  const url = new URL('/app/', resolveSiteOrigin())
  url.searchParams.set('share', resolveDocumentShareToken(doc))
  return url.toString()
}

export function resolveOrderRoute(doc: CatalogDocument): string {
  const params = new URLSearchParams()
  params.set('topic', doc.title)
  params.set('sampleTitle', doc.title)
  params.set('sample', resolveDocumentShareToken(doc))
  if (doc.subject) params.set('subject', doc.subject)
  if (doc.category) params.set('category', doc.category)
  const sampleType = normalizeDocType(doc)
  if (sampleType) params.set('sampleType', sampleType)
  return `/order?${params.toString()}`
}

export function buildDocumentHandoff(
  doc: CatalogDocument,
  mode: DocumentHandoffMode,
): DocumentHandoffState {
  return {
    key: documentKey(doc),
    shareToken: resolveDocumentShareToken(doc),
    title: doc.title,
    subject: doc.subject,
    category: doc.category,
    fileLabel: `${resolveDocumentBadge(doc)} · ${doc.size}`,
    mode,
    orderRoute: resolveOrderRoute(doc),
    createdAt: Date.now(),
  }
}

export function loadDocumentHandoff(): DocumentHandoffState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FILE_HANDOFF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DocumentHandoffState>
    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.shareToken !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.category !== 'string' ||
      typeof parsed.fileLabel !== 'string' ||
      (parsed.mode !== 'preview' && parsed.mode !== 'download') ||
      typeof parsed.orderRoute !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      window.localStorage.removeItem(FILE_HANDOFF_KEY)
      return null
    }

    if (Date.now() - parsed.createdAt > FILE_HANDOFF_TTL) {
      window.localStorage.removeItem(FILE_HANDOFF_KEY)
      return null
    }

    return {
      key: parsed.key,
      shareToken: parsed.shareToken,
      title: parsed.title,
      subject: typeof parsed.subject === 'string' ? parsed.subject : '',
      category: parsed.category,
      fileLabel: parsed.fileLabel,
      mode: parsed.mode,
      orderRoute: parsed.orderRoute,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

export function saveDocumentHandoff(handoff: DocumentHandoffState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FILE_HANDOFF_KEY, JSON.stringify(handoff))
}

export function clearDocumentHandoff(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(FILE_HANDOFF_KEY)
}

export function launchDocumentFile(
  doc: CatalogDocument,
  options: { forceDownload?: boolean } = {},
): DocumentLaunchResult {
  if (typeof window === 'undefined') return 'same-tab'

  const previewable = canPreviewDocument(doc)
  const forceDownload = Boolean(options.forceDownload)
  const fileUrl = resolveFileUrl(doc)

  saveDocumentHandoff(buildDocumentHandoff(doc, forceDownload || !previewable ? 'download' : 'preview'))

  const link = window.document.createElement('a')
  link.href = fileUrl
  link.rel = 'noopener noreferrer'
  link.style.display = 'none'

  if (forceDownload) {
    link.download = resolveDownloadName(doc)
    window.document.body.append(link)
    link.click()
    link.remove()
    return 'download'
  }

  if (previewable) {
    const openedWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer')
    if (openedWindow) return 'new-tab'
  }

  link.target = '_blank'
  if (!previewable) {
    link.download = resolveDownloadName(doc)
  }
  window.document.body.append(link)
  link.click()
  link.remove()
  return previewable ? 'new-tab' : 'download'
}

export function resolveDocumentShareUrl(doc: CatalogDocument): string {
  return new URL(`/app/share/${resolveDocumentShareToken(doc)}/`, resolveSiteOrigin()).toString()
}

export function resolveDocumentShareHeadline(doc: CatalogDocument): string {
  return trimText(doc.catalogTitle || doc.title || resolveDownloadName(doc), 84)
}

export function resolveDocumentShareText(doc: CatalogDocument): string {
  return [
    'Библиотека Салона',
    `«${resolveDocumentShareHeadline(doc)}»`,
    'Открой документ и вернись в каталог по этой теме.',
  ].join('\n')
}

export function resolveLibraryAppUrl(options: { invite?: boolean; entry?: string } = {}): string {
  const url = new URL('/app/', resolveSiteOrigin())

  if (options.invite) {
    url.searchParams.set('invite', '1')
  }

  if (options.entry) {
    url.searchParams.set('entry', options.entry)
  }

  return url.toString()
}

export function resolveCatalogShareUrl(options: { query?: string; category?: string; entry?: string } = {}): string {
  const url = new URL('/app/', resolveSiteOrigin())
  const query = options.query?.replace(/\s+/g, ' ').trim()
  const category = options.category?.trim()

  if (query) {
    url.searchParams.set('q', query)
  }

  if (category && category !== 'all') {
    url.searchParams.set('category', category)
  }

  if (options.entry) {
    url.searchParams.set('entry', options.entry)
  }

  return url.toString()
}

export function resolveLibrarySharePayload(): AppSharePayload {
  return {
    title: 'Библиотека студенческих работ · БиблиоСалон',
    text:
      'Отправляю ссылку на БиблиоСалон: каталог готовых студенческих работ, избранное и заказ в одном приложении.',
    url: resolveLibraryAppUrl({ invite: true, entry: 'shared' }),
  }
}

export function resolveCatalogSharePayload(options: {
  query?: string
  category?: string
  count?: number
} = {}): AppSharePayload {
  const query = options.query?.replace(/\s+/g, ' ').trim()
  const category = options.category?.trim()
  const countLabel =
    typeof options.count === 'number' && options.count > 0
      ? ` Внутри уже ${formatRussianCount(options.count, [
          'готовый пример',
          'готовых примера',
          'готовых примеров',
        ])}.`
      : ''

  if (query && category && category !== 'all') {
    return {
      title: `Подборка по теме «${trimText(query, 64)}»`,
      text: `Собрал для тебя подборку по запросу «${query}» в разделе «${category}».${countLabel} Открой её в Библиотеке Салона.`,
      url: resolveCatalogShareUrl({ query, category, entry: 'shared' }),
    }
  }

  if (query) {
    return {
      title: `Подборка по теме «${trimText(query, 64)}»`,
      text: `Здесь уже собраны готовые материалы по запросу «${query}».${countLabel} Открой подборку в Библиотеке Салона.`,
      url: resolveCatalogShareUrl({ query, entry: 'shared' }),
    }
  }

  if (category && category !== 'all') {
    return {
      title: `Раздел «${trimText(category, 64)}» · БиблиоСалон`,
      text: `В этом разделе собраны готовые работы по теме.${countLabel} Открой подборку в БиблиоСалоне.`,
      url: resolveCatalogShareUrl({ category, entry: 'shared' }),
    }
  }

  return resolveLibrarySharePayload()
}

export async function shareResource(payload: AppSharePayload): Promise<'shared' | 'copied' | 'dismissed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      })
      return 'shared'
    } catch {
      return 'dismissed'
    }
  }

  const text = [payload.title, payload.text, payload.url].filter(Boolean).join('\n')

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.prompt('Скопируй ссылку', payload.url)
    return 'copied'
  }

  return 'dismissed'
}

export function resolveDocumentBadge(doc: CatalogDocument): string {
  return resolveDocumentExtension(doc)
}

export function normalizeDocType(doc: CatalogDocument): string {
  return doc.docType?.trim() || doc.tags?.[1] || 'Документ'
}

export function resolveTopicLabel(doc: CatalogDocument): string {
  return doc.subject?.trim() || doc.category?.trim() || doc.title.trim()
}

export function getSnippet(doc: CatalogDocument): string {
  const source = doc.catalogDescription || doc.description || doc.text || ''
  return source.trim()
}

export function loadFavoriteKeys(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function saveFavoriteKeys(keys: string[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(keys))
}

export function loadRecentKeys(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function saveRecentKeys(keys: string[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(keys))
}

export function rememberRecent(keys: string[], key: string, limit = 6): string[] {
  return [key, ...keys.filter((item) => item !== key)].slice(0, limit)
}

export function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function saveRecentSearches(queries: string[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(queries))
}

export function rememberSearchQuery(queries: string[], query: string, limit = 6): string[] {
  const normalized = query.replace(/\s+/g, ' ').trim()
  if (!normalized) return queries

  return [
    normalized,
    ...queries.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, limit)
}

export function toggleFavorite(keys: string[], key: string): string[] {
  if (keys.includes(key)) {
    return keys.filter((item) => item !== key)
  }
  return [key, ...keys]
}

function scoreDocumentMatch(doc: CatalogDocument, query: string): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const title = doc.title.toLowerCase()
  const subject = doc.subject.toLowerCase()
  const category = doc.category.toLowerCase()
  const description = [doc.catalogDescription, doc.description, doc.text].join(' ').toLowerCase()
  const docType = normalizeDocType(doc).toLowerCase()
  const tags = doc.tags.map((tag) => tag.toLowerCase())
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  let score = 0

  if (title === normalizedQuery) score += 180
  else if (title.startsWith(normalizedQuery)) score += 110
  else if (title.includes(normalizedQuery)) score += 70

  if (subject === normalizedQuery) score += 96
  else if (subject.startsWith(normalizedQuery)) score += 64
  else if (subject.includes(normalizedQuery)) score += 36

  if (category === normalizedQuery) score += 88
  else if (category.startsWith(normalizedQuery)) score += 56
  else if (category.includes(normalizedQuery)) score += 30

  if (docType === normalizedQuery) score += 48
  else if (docType.includes(normalizedQuery)) score += 22

  if (tags.some((tag) => tag === normalizedQuery)) score += 54
  else if (tags.some((tag) => tag.includes(normalizedQuery))) score += 28

  if (description.includes(normalizedQuery)) score += 14

  for (const token of tokens) {
    if (token.length < 2) continue
    if (title.includes(token)) score += 18
    if (subject.includes(token)) score += 12
    if (category.includes(token)) score += 10
    if (docType.includes(token)) score += 8
    if (tags.some((tag) => tag.includes(token))) score += 7
    if (description.includes(token)) score += 4
  }

  return score
}

export function buildQuerySearch(
  docs: CatalogDocument[],
  query: string,
  category: string,
): CatalogDocument[] {
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = docs.filter((doc) => {
    const categoryOk = category === 'all' || doc.category === category
    if (!categoryOk) return false

    if (!normalizedQuery) return true

    const haystack = [
      doc.title,
      doc.catalogDescription,
      doc.subject,
      doc.category,
      doc.docType,
      ...doc.tags,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  if (!normalizedQuery) return filtered

  return filtered
    .map((doc) => ({
      doc,
      score: scoreDocumentMatch(doc, normalizedQuery),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const leftTitle = left.doc.title.length
      const rightTitle = right.doc.title.length
      if (leftTitle !== rightTitle) return leftTitle - rightTitle
      return left.doc.title.localeCompare(right.doc.title, 'ru')
    })
    .map(({ doc }) => doc)
}

export function topCategories(docs: CatalogDocument[], limit = 5): string[] {
  const counts = docs.reduce<Map<string, number>>((acc, doc) => {
    acc.set(doc.category, (acc.get(doc.category) ?? 0) + 1)
    return acc
  }, new Map())

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name)
}

export function groupedCategoryStats(docs: CatalogDocument[]) {
  const stats = docs.reduce<
    Map<
      string,
      {
        count: number
        subjects: Set<string>
      }
    >
  >((acc, doc) => {
    const current = acc.get(doc.category) ?? { count: 0, subjects: new Set<string>() }
    current.count += 1
    if (doc.subject) current.subjects.add(doc.subject)
    acc.set(doc.category, current)
    return acc
  }, new Map())

  return [...stats.entries()]
    .map(([category, value]) => ({
      category,
      count: value.count,
      subjects: value.subjects.size,
    }))
    .sort((a, b) => b.count - a.count)
}

export function topSubjects(docs: CatalogDocument[], limit = 10) {
  const stats = docs.reduce<Map<string, number>>((acc, doc) => {
    if (!doc.subject) return acc
    acc.set(doc.subject, (acc.get(doc.subject) ?? 0) + 1)
    return acc
  }, new Map())

  return [...stats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([subject, count]) => ({ subject, count }))
}

export function formatRelativeSyncTime(updatedAt: number | null): string {
  if (!updatedAt) return 'недавно'
  const diffMs = Date.now() - updatedAt
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
  const minutes = Math.round(diffMs / 60000)

  if (Math.abs(minutes) < 1) return 'только что'
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')

  const days = Math.round(hours / 24)
  return rtf.format(-days, 'day')
}

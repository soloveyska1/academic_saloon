import { Fragment, type ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock3,
  Download,
  Eye,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  canPreviewDocument,
  CatalogSyncState,
  CatalogDocument,
  DocumentHandoffState,
  buildQuerySearch,
  documentKey,
  getSnippet,
  launchDocumentFile,
  normalizeDocType,
  resolveDocumentBadge,
  resolveDocumentShareToken,
  resolveOrderRoute,
  topCategories,
} from '../lib/catalog'
import { DocumentSheet } from '../components/DocumentSheet'
import { formatRussianCount } from '../lib/russian'

interface CatalogScreenProps {
  documents: CatalogDocument[]
  favoriteKeys: string[]
  isLoading: boolean
  error: string | null
  syncState: CatalogSyncState
  syncLabel: string
  isOnline: boolean
  isRefreshing: boolean
  recentDocuments: CatalogDocument[]
  recentSearches: string[]
  fileHandoff: DocumentHandoffState | null
  handoffDocument: CatalogDocument | null
  onClearFileHandoff: () => void
  onClearRecentSearches: () => void
  onOpenDocument: (doc: CatalogDocument) => void
  onRememberSearchQuery: (query: string) => void
  onRefreshCatalog: () => void
  onToggleFavorite: (doc: CatalogDocument) => void
}

interface IncomingShareIntent {
  title: string
  snippet: string
  searchQuery: string
  sourceLabel: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderHighlightedText(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return text

  const tokens = Array.from(
    new Set(
      normalizedQuery
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  ).sort((left, right) => right.length - left.length)

  if (!tokens.length) return text

  const matcher = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(matcher)
  if (parts.length === 1) return text

  return parts.map((part, index) =>
    tokens.some((token) => part.toLowerCase() === token) ? (
      <mark key={`${part}-${index}`} className="query-mark">
        {part}
      </mark>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  )
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function trimCopy(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function buildIncomingShareIntent(sharedTitle: string, sharedText: string, sharedUrl: string): IncomingShareIntent | null {
  const normalizedTitle = normalizeText(sharedTitle)
  const normalizedText = normalizeText(sharedText.replace(/https?:\/\/\S+/gi, ' '))
  const sourceLabel = (() => {
    try {
      const hostname = new URL(sharedUrl).hostname.replace(/^www\./, '')
      return hostname ? `Из ${hostname}` : 'Из другого приложения'
    } catch {
      return 'Из другого приложения'
    }
  })()
  const rawSearchQuery = normalizeText([normalizedTitle, normalizedText].filter(Boolean).join(' '))

  if (!rawSearchQuery) return null

  const snippet = trimCopy(
    normalizeText(
      [
        normalizedTitle,
        normalizedText && normalizedText.toLowerCase() !== normalizedTitle.toLowerCase() ? normalizedText : '',
      ]
        .filter(Boolean)
        .join(' — '),
    ),
    180,
  )

  return {
    title: normalizedTitle || 'Новое задание',
    snippet: snippet || 'Можно найти похожие материалы или оформить заказ по этой теме.',
    searchQuery: trimCopy(rawSearchQuery, 96),
    sourceLabel,
  }
}

export function CatalogScreen({
  documents,
  favoriteKeys,
  isLoading,
  error,
  syncState,
  syncLabel,
  isOnline,
  isRefreshing,
  recentDocuments,
  recentSearches,
  fileHandoff,
  handoffDocument,
  onClearFileHandoff,
  onClearRecentSearches,
  onOpenDocument,
  onRememberSearchQuery,
  onRefreshCatalog,
  onToggleFavorite,
}: CatalogScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null)
  const revealResultsTimeoutRef = useRef<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(queryParam)
  const [selected, setSelected] = useState<CatalogDocument | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const selectedCategory = searchParams.get('category') ?? 'all'
  const sharedToken = searchParams.get('share')
  const focusShortcut = searchParams.get('focus') === 'search'
  const sharedTitleParam = searchParams.get('sharedTitle') ?? ''
  const sharedTextParam = searchParams.get('sharedText') ?? ''
  const sharedUrlParam = searchParams.get('sharedUrl') ?? ''

  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = query.trim()
  const isQueryMode = Boolean(normalizedQuery)
  const featuredCategories = useMemo(() => ['all', ...topCategories(documents)], [documents])
  const categoryStats = useMemo(
    () =>
      documents.reduce<Map<string, number>>((acc, doc) => {
        acc.set(doc.category, (acc.get(doc.category) ?? 0) + 1)
        return acc
      }, new Map()),
    [documents],
  )
  const visibleDocuments = useMemo(
    () => buildQuerySearch(documents, deferredQuery, selectedCategory),
    [documents, deferredQuery, selectedCategory],
  )
  const showSyncState = syncState.isStale || syncState.source === 'cache'
  const resumeDocument = !query && selectedCategory === 'all' ? recentDocuments[0] : null
  const showHomePrimer = !query && selectedCategory === 'all' && !isSearchFocused
  const showSearchAssist = isSearchFocused && !query.trim()
  const searchAssistQueries = useMemo(
    () => recentSearches.filter((item) => item.toLowerCase() !== normalizedQuery.toLowerCase()).slice(0, 4),
    [normalizedQuery, recentSearches],
  )
  const incomingShareIntent = useMemo(
    () => buildIncomingShareIntent(sharedTitleParam, sharedTextParam, sharedUrlParam),
    [sharedTextParam, sharedTitleParam, sharedUrlParam],
  )
  const selectedCategoryCount =
    selectedCategory === 'all' ? documents.length : (categoryStats.get(selectedCategory) ?? 0)
  const relatedDocuments = useMemo(() => {
    if (!selected) return []
    const selectedKey = documentKey(selected)
    return documents
      .filter((doc) => documentKey(doc) !== selectedKey)
      .sort((left, right) => {
        const leftScore =
          (left.subject && selected.subject && left.subject === selected.subject ? 2 : 0) +
          (left.category === selected.category ? 1 : 0)
        const rightScore =
          (right.subject && selected.subject && right.subject === selected.subject ? 2 : 0) +
          (right.category === selected.category ? 1 : 0)
        return rightScore - leftScore
      })
      .filter((doc) =>
        selected.subject
          ? doc.subject === selected.subject || doc.category === selected.category
          : doc.category === selected.category,
      )
      .slice(0, 3)
  }, [documents, selected])
  const topMatch = isQueryMode && visibleDocuments.length ? visibleDocuments[0] : null
  const listDocuments = topMatch ? visibleDocuments.slice(1) : visibleDocuments
  const topMatchSummary = topMatch ? getSnippet(topMatch) : ''

  useEffect(() => {
    setShowFilters(false)
    if (location.pathname !== '/') {
      setSheetOpen(false)
      setSelected(null)
      setIsSearchFocused(false)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!showFilters) return
    document.body.classList.add('has-overlay')
    return () => document.body.classList.remove('has-overlay')
  }, [showFilters])

  useEffect(() => {
    if (!isSearchFocused) return
    document.body.classList.add('is-searching')
    return () => document.body.classList.remove('is-searching')
  }, [isSearchFocused])

  useEffect(
    () => () => {
      if (revealResultsTimeoutRef.current) {
        window.clearTimeout(revealResultsTimeoutRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!sharedToken || !documents.length) return
    const sharedDocument = documents.find((doc) => resolveDocumentShareToken(doc) === sharedToken)
    if (!sharedDocument) return

    const selectedKey = selected ? documentKey(selected) : null
    const sharedKey = documentKey(sharedDocument)
    if (sheetOpen && selectedKey === sharedKey) return

    onOpenDocument(sharedDocument)
    setSelected(sharedDocument)
    setSheetOpen(true)
  }, [documents, onOpenDocument, selected, sheetOpen, sharedToken])

  useEffect(() => {
    if (!focusShortcut) return

    const frame = window.requestAnimationFrame(() => {
      setIsSearchFocused(true)
      searchInputRef.current?.focus({ preventScroll: true })
    })

    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.delete('focus')
      setSearchParams(params, { replace: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [focusShortcut, searchParams, setSearchParams])

  useEffect(() => {
    if (queryParam === query) return

    const activeElement = document.activeElement
    const searchFocused =
      activeElement instanceof HTMLInputElement && activeElement.closest('.search-bar')

    if (!searchFocused) {
      setQuery(queryParam)
    }
  }, [query, queryParam])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query === queryParam) return

      startTransition(() => {
        const params = new URLSearchParams(searchParams)
        if (query.trim()) {
          params.set('q', query)
        } else {
          params.delete('q')
        }
        setSearchParams(params, { replace: true })
      })
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [query, queryParam, searchParams, setSearchParams])

  useEffect(() => {
    if (!incomingShareIntent || queryParam.trim()) return

    const nextQuery = incomingShareIntent.searchQuery
    dismissSearchMode()
    setQuery(nextQuery)
    onRememberSearchQuery(nextQuery)

    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.delete('invite')
      params.delete('sharedTitle')
      params.delete('sharedText')
      params.delete('sharedUrl')
      params.delete('category')
      params.set('q', nextQuery)
      setSearchParams(params, { replace: true })
    })

    window.requestAnimationFrame(() => revealResults())
  }, [incomingShareIntent, onRememberSearchQuery, queryParam, searchParams, setSearchParams])

  function updateSharedParam(doc: CatalogDocument | null) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (doc) {
        params.set('share', resolveDocumentShareToken(doc))
      } else {
        params.delete('share')
      }
      setSearchParams(params, { replace: true })
    })
  }

  function openDocument(doc: CatalogDocument) {
    if (normalizedQuery) {
      onRememberSearchQuery(normalizedQuery)
    }
    dismissSearchMode()
    onOpenDocument(doc)
    setSelected(doc)
    setSheetOpen(true)
    updateSharedParam(doc)
  }

  function openDocumentFile(doc: CatalogDocument) {
    if (normalizedQuery) {
      onRememberSearchQuery(normalizedQuery)
    }
    dismissSearchMode()
    onOpenDocument(doc)
    launchDocumentFile(doc)
  }

  function closeDocument() {
    setSheetOpen(false)
    updateSharedParam(null)
    window.setTimeout(() => setSelected(null), 180)
  }

  function updateSearch(nextValue: string) {
    setQuery(nextValue)
  }

  function dismissSearchMode() {
    setIsSearchFocused(false)
    searchInputRef.current?.blur()
  }

  function revealResults() {
    if (revealResultsTimeoutRef.current) {
      window.clearTimeout(revealResultsTimeoutRef.current)
    }

    revealResultsTimeoutRef.current = window.setTimeout(() => {
      resultsAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 140)
  }

  function syncCatalogIntent(nextQuery: string, nextCategory = selectedCategory) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.delete('focus')
      params.delete('entry')
      if (nextQuery) {
        params.set('q', nextQuery)
      } else {
        params.delete('q')
      }

      if (nextCategory === 'all') {
        params.delete('category')
      } else {
        params.set('category', nextCategory)
      }

      setSearchParams(params, { replace: true })
    })
  }

  function applyQuickQuery(nextValue: string) {
    const nextQuery = nextValue.replace(/\s+/g, ' ').trim()
    dismissSearchMode()
    setQuery(nextQuery)
    syncCatalogIntent(nextQuery)
    revealResults()
  }

  function updateCategory(nextCategory: string, options: { reveal?: boolean } = {}) {
    syncCatalogIntent(query.trim(), nextCategory)
    if (options.reveal) {
      revealResults()
    }
  }

  function resetFilters() {
    setQuery('')
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.delete('entry')
      params.delete('q')
      params.delete('category')
      setSearchParams(params, { replace: true })
    })
  }

  function openOrderBySearch(doc?: CatalogDocument) {
    if (normalizedQuery) {
      onRememberSearchQuery(normalizedQuery)
    }
    dismissSearchMode()

    if (doc) {
      if (normalizedQuery) {
        const [, queryString = ''] = resolveOrderRoute(doc).split('?')
        const params = new URLSearchParams(queryString)
        params.set('topic', normalizedQuery)
        navigate(`/order?${params.toString()}`)
        return
      }

      navigate(resolveOrderRoute(doc))
      return
    }

    navigate(`/order?topic=${encodeURIComponent(normalizedQuery)}`)
  }

  function runQuickSearch(nextValue: string) {
    const nextQuery = nextValue.replace(/\s+/g, ' ').trim()
    dismissSearchMode()
    setQuery(nextQuery)
    syncCatalogIntent(nextQuery)
    revealResults()
  }

  return (
    <>
      <section className="screen screen--catalog-view">
        <header
          className={
            isSearchFocused
              ? 'screen-header screen-header--catalog screen-header--searching'
              : 'screen-header screen-header--catalog'
          }
        >
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            <span>Библиотека Салона</span>
          </div>
          <div className="screen-header__row">
            <div>
              <h1>Каталог</h1>
              <p>Готовые работы по теме.</p>
            </div>
            <button type="button" className="icon-button icon-button--gold" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal size={18} />
            </button>
          </div>
          <div className="search-row" data-tour="catalog-search">
            <label className={isSearchFocused ? 'search-bar search-bar--active' : 'search-bar'}>
              <Search size={18} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => updateSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && topMatch) {
                    event.preventDefault()
                    openDocument(topMatch)
                  }
                  if (event.key === 'Escape') {
                    dismissSearchMode()
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                placeholder="Тема, предмет, тип работы"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
              />
              {query ? (
                <button
                  type="button"
                  className="search-bar__clear"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => updateSearch('')}
                  aria-label="Очистить поиск"
                >
                  <X size={16} />
                </button>
              ) : null}
            </label>
            {isSearchFocused ? (
              <button
                type="button"
                className="search-cancel"
                onMouseDown={(event) => event.preventDefault()}
                onClick={dismissSearchMode}
              >
                Отмена
              </button>
            ) : null}
          </div>
          {!isSearchFocused ? (
            <>
              {!isOnline ? (
                <div className="status-stack">
                  <div className="status-line status-line--offline">
                    <span className="status-line__dot" />
                    <span>Нет сети. Каталог останется доступным на этом устройстве.</span>
                  </div>
                </div>
              ) : showSyncState || isRefreshing ? (
                <div className="status-stack">
                  <div className={syncState.isStale ? 'status-line status-line--stale' : 'status-line'}>
                    <span className="status-line__dot" />
                    <span>{isRefreshing ? 'Обновляем каталог…' : syncLabel}</span>
                  </div>
                  <button
                    type="button"
                    className="status-line__action"
                    onClick={onRefreshCatalog}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? 'Обновляем…' : 'Обновить'}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {showSearchAssist ? (
            <div className="search-assist">
              {searchAssistQueries.length ? (
                <div className="search-assist__group">
                  <div className="search-assist__head">
                    <div className="search-assist__label">Недавние</div>
                    <button
                      type="button"
                      className="search-assist__reset"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={onClearRecentSearches}
                    >
                      Очистить
                    </button>
                  </div>
                  <div className="chip-row search-assist__chips">
                    {searchAssistQueries.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="chip chip--ghost"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyQuickQuery(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chip-row search-assist__chips">
                  {['курсовая', 'отчёт по практике', 'диплом'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="chip"
                      onClick={() => applyQuickQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </header>

        {error ? <div className="panel panel--error">{error}</div> : null}

        {isLoading ? (
          <div className="list">
            {Array.from({ length: 6 }).map((_, index) => (
              <article className="doc-row doc-row--skeleton" key={index}>
                <div className="doc-row__icon" />
                <div className="doc-row__copy">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            {showHomePrimer && resumeDocument ? (
              <section className="catalog-primer">
                <button
                  type="button"
                  className="catalog-primer__resume"
                  data-tour="catalog-start"
                  onClick={() => openDocument(resumeDocument)}
                >
                  <div className="catalog-primer__resume-icon">
                    <Clock3 size={16} />
                  </div>
                  <div className="catalog-primer__resume-copy">
                    <span>Продолжить</span>
                    <strong>{resumeDocument.title}</strong>
                    <small>{resumeDocument.subject || resumeDocument.category}</small>
                  </div>
                  <div className="catalog-primer__resume-action">Открыть</div>
                </button>
              </section>
            ) : null}
            <div ref={resultsAnchorRef} className="results-anchor" aria-hidden="true" />
            <div className="list-head">
              <div className="list-head__copy">
                {visibleDocuments.length !== documents.length || selectedCategory !== 'all' || query ? (
                  <span>{formatRussianCount(visibleDocuments.length, ['документ', 'документа', 'документов'])}</span>
                ) : null}
                <strong>
                  {selectedCategory === 'all'
                    ? normalizedQuery
                      ? 'Найдено'
                      : 'Каталог'
                    : selectedCategory}
                </strong>
              </div>
              {selectedCategory !== 'all' || query ? (
                <button type="button" className="list-head__reset" onClick={resetFilters}>
                  Сбросить
                </button>
              ) : null}
            </div>
            {topMatch ? (
              <article className="top-match">
                <div className="top-match__head">
                  <span className="top-match__label">Лучшее совпадение</span>
                </div>
                <button type="button" className="top-match__main" onClick={() => openDocument(topMatch)}>
                  <div className="top-match__meta">
                    {normalizedQuery ? <span className="top-match__query">«{normalizedQuery}»</span> : null}
                    <small>
                      {renderHighlightedText(topMatch.subject || topMatch.category, normalizedQuery)} ·{' '}
                      {normalizeDocType(topMatch)} · {topMatch.size}
                    </small>
                  </div>
                  <strong>{renderHighlightedText(topMatch.title, normalizedQuery)}</strong>
                  <p>
                    {topMatchSummary
                      ? renderHighlightedText(topMatchSummary, normalizedQuery)
                      : 'Открой карточку или файл.'}
                  </p>
                </button>
                <div className="top-match__actions">
                  <button type="button" className="primary-action primary-action--wide" onClick={() => openDocumentFile(topMatch)}>
                    {canPreviewDocument(topMatch) ? <Eye size={18} /> : <Download size={18} />}
                    <span>{canPreviewDocument(topMatch) ? 'Сразу открыть файл' : 'Сразу скачать файл'}</span>
                  </button>
                </div>
              </article>
            ) : null}
            {listDocuments.length ? (
              <div className="list">
                {listDocuments.map((doc) => {
                  const favorite = favoriteKeys.includes(documentKey(doc))
                  return (
                    <button
                      key={documentKey(doc)}
                      type="button"
                      className={favorite ? 'doc-row doc-row--favorite' : 'doc-row'}
                      onClick={() => openDocument(doc)}
                    >
                      <div className="doc-row__icon">{resolveDocumentBadge(doc)}</div>
                      <div className="doc-row__copy">
                        <div className="doc-row__kicker">
                          <span>{renderHighlightedText(doc.subject || doc.category, normalizedQuery)}</span>
                        </div>
                        <h3>{renderHighlightedText(doc.title, normalizedQuery)}</h3>
                        <div className="doc-row__details">
                          <span>{normalizeDocType(doc)}</span>
                          <span>{doc.size}</span>
                          {selectedCategory === 'all' && doc.subject && doc.subject !== doc.category ? (
                            <span>{renderHighlightedText(doc.category, normalizedQuery)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="doc-row__aside">
                        {favorite ? <Star size={15} fill="currentColor" /> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="panel panel--empty panel--search-empty">
                <Sparkles size={24} />
                <h2>По этому запросу пока ничего нет</h2>
                <p>{normalizedQuery ? 'Можно открыть разделы или оформить работу по теме.' : 'Попробуй другой запрос или открой нужный раздел.'}</p>
                <div className="panel__actions">
                  {normalizedQuery ? (
                    <>
                      <button type="button" className="primary-action" onClick={() => openOrderBySearch()}>
                        Оформить заказ
                      </button>
                      <button type="button" className="secondary-action" onClick={() => navigate('/categories')}>
                        Открыть разделы
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="primary-action" onClick={resetFilters}>
                        Сбросить поиск
                      </button>
                      <button type="button" className="secondary-action" onClick={() => navigate('/categories')}>
                        Открыть разделы
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>

      <AnimatePresence>
        {showFilters ? (
          <>
            <motion.button
              type="button"
              className="sheet-backdrop"
              onClick={() => setShowFilters(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              className="sheet sheet--filters"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.16 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 96 || info.velocity.y > 720) {
                  setShowFilters(false)
                }
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="sheet__handle" />
              <div className="sheet__header">
                <div>
                  <div className="doc-pill">Подборка</div>
                  <h2>{selectedCategory === 'all' ? 'Выбери раздел' : 'Сейчас открыт раздел'}</h2>
                  <p>
                    {selectedCategory === 'all'
                      ? 'Выбери раздел из каталога.'
                      : `${formatRussianCount(selectedCategoryCount, ['работа', 'работы', 'работ'])} в разделе «${selectedCategory}».`}
                  </p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowFilters(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="sheet__content">
                <div className="filter-summary">
                  <span>Показываем сейчас</span>
                  <strong>{selectedCategory === 'all' ? 'Все работы' : selectedCategory}</strong>
                  <p>
                    {selectedCategory === 'all'
                      ? `${formatRussianCount(documents.length, ['работа', 'работы', 'работ'])} по всем разделам`
                      : `${formatRussianCount(selectedCategoryCount, ['работа', 'работы', 'работ'])} в выбранном разделе`}
                  </p>
                </div>
                <div className="selection-grid selection-grid--two filter-selection-grid">
                  {featuredCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        category === selectedCategory
                          ? 'selection-card selection-card--active filter-card'
                          : 'selection-card filter-card'
                      }
	                      onClick={() => {
	                        updateCategory(category, { reveal: true })
	                        setShowFilters(false)
	                      }}
                    >
                      <strong>{category === 'all' ? 'Все работы' : category}</strong>
                      <span>
                        {category === 'all'
                          ? formatRussianCount(documents.length, ['работа', 'работы', 'работ'])
                          : formatRussianCount(categoryStats.get(category) ?? 0, ['работа', 'работы', 'работ'])}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {selectedCategory !== 'all' ? (
                <div className="sheet__actions sheet__actions--filters">
                  <button
                    type="button"
                    className="secondary-action secondary-action--wide"
	                    onClick={() => {
	                      updateCategory('all', { reveal: true })
	                      setShowFilters(false)
	                    }}
                  >
                    Показать все работы
                  </button>
                </div>
              ) : null}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      <DocumentSheet
        document={sheetOpen ? selected : null}
        isFavorite={selected ? favoriteKeys.includes(documentKey(selected)) : false}
        relatedDocuments={relatedDocuments}
        onClose={closeDocument}
        onOpenCategory={(category) => {
          closeDocument()
          window.setTimeout(() => navigate(`/?category=${encodeURIComponent(category)}`), 180)
        }}
        onOpenRelatedDocument={openDocument}
        onOpenFavorites={() => {
          closeDocument()
          window.setTimeout(() => navigate('/favorites'), 180)
        }}
        onToggleFavorite={onToggleFavorite}
        onOrderByDoc={(doc) => navigate(resolveOrderRoute(doc))}
      />
    </>
  )
}

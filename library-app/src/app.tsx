import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CloudOff, Link2, Star, Wifi } from 'lucide-react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { RouteTransitionSkeleton } from './components/RouteTransitionSkeleton'
import { CatalogScreen } from './screens/CatalogScreen'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'
import { OrderScreen } from './screens/OrderScreen'
import { SupportScreen } from './screens/SupportScreen'
import { getFriendlyErrorMessage } from './lib/errors'
import {
  CatalogDocument,
  CatalogSyncState,
  clearDocumentHandoff,
  documentKey,
  fetchCatalog,
  formatRelativeSyncTime,
  getCachedCatalogSnapshot,
  loadDocumentHandoff,
  loadFavoriteKeys,
  loadRecentKeys,
  loadRecentSearches,
  rememberRecent,
  rememberSearchQuery,
  saveFavoriteKeys,
  saveRecentKeys,
  saveRecentSearches,
  toggleFavorite,
} from './lib/catalog'
import {
  loadRouteScroll,
  saveRouteScroll,
} from './lib/uiState'

interface ToastState {
  message: string
  tone: 'saved' | 'removed' | 'shared'
  actionLabel?: string
  onAction?: () => void
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function App() {
  const location = useLocation()
  const bootReadyRef = useRef(false)
  const [documents, setDocuments] = useState<CatalogDocument[]>([])
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>(() => loadFavoriteKeys())
  const [recentKeys, setRecentKeys] = useState<string[]>(() => loadRecentKeys())
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileHandoff, setFileHandoff] = useState(() => loadDocumentHandoff())
  const [syncState, setSyncState] = useState<CatalogSyncState>({
    source: 'network',
    updatedAt: null,
    isStale: false,
  })
  const [catalogReloadKey, setCatalogReloadKey] = useState(0)
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [showReconnectHint, setShowReconnectHint] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [transitionPath, setTransitionPath] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const routeTransitionTimerRef = useRef<number | null>(null)
  const previousPathRef = useRef(location.pathname)
  const routeKey = location.pathname

  useEffect(() => {
    const restore = () => {
      const savedOffset = loadRouteScroll(routeKey)
      window.scrollTo({ top: savedOffset ?? 0, left: 0, behavior: 'auto' })
    }

    const frame = window.requestAnimationFrame(restore)
    let saveFrame: number | null = null
    const flushSave = () => {
      saveFrame = null
      saveRouteScroll(routeKey, window.scrollY)
    }
    const save = () => {
      if (saveFrame !== null) return
      saveFrame = window.requestAnimationFrame(flushSave)
    }

    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('pagehide', save)

    return () => {
      window.cancelAnimationFrame(frame)
      if (saveFrame !== null) {
        window.cancelAnimationFrame(saveFrame)
      }
      saveRouteScroll(routeKey, window.scrollY)
      window.removeEventListener('scroll', save)
      window.removeEventListener('pagehide', save)
    }
  }, [routeKey])

  useEffect(() => {
    const controller = new AbortController()
    const cached = getCachedCatalogSnapshot()
    const isRefreshRun = catalogReloadKey > 0

    if (cached) {
      setDocuments(cached.documents)
      setSyncState(cached.sync)
      if (!isRefreshRun) {
        setIsLoading(false)
      }
    } else {
      setIsLoading(true)
    }

    if (isRefreshRun) {
      setIsRefreshingCatalog(true)
    }

    setError(null)

    fetchCatalog(controller.signal)
      .then(({ documents: items, sync }) => {
        setDocuments(items)
        setSyncState(sync)
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return
        setError(getFriendlyErrorMessage(fetchError, 'Не удалось открыть каталог. Проверь интернет и попробуй ещё раз.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
          setIsRefreshingCatalog(false)
        }
      })

    return () => controller.abort()
  }, [catalogReloadKey])

  useEffect(() => {
    if (isLoading || bootReadyRef.current) return

    bootReadyRef.current = true
    window.dispatchEvent(new Event('bibliosaloon:app-ready'))
  }, [isLoading])

  useEffect(() => {
    saveFavoriteKeys(favoriteKeys)
  }, [favoriteKeys])

  useEffect(() => {
    saveRecentKeys(recentKeys)
  }, [recentKeys])

  useEffect(() => {
    saveRecentSearches(recentSearches)
  }, [recentSearches])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      if (routeTransitionTimerRef.current) {
        window.clearTimeout(routeTransitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return

    previousPathRef.current = location.pathname

    if (routeTransitionTimerRef.current) {
      window.clearTimeout(routeTransitionTimerRef.current)
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setTransitionPath(location.pathname)
    routeTransitionTimerRef.current = window.setTimeout(() => {
      setTransitionPath(null)
      routeTransitionTimerRef.current = null
    }, prefersReducedMotion ? 180 : 420)
  }, [location.pathname])

  useEffect(() => {
    const badgeNavigator = navigator as BadgeNavigator
    if (!badgeNavigator.setAppBadge && !badgeNavigator.clearAppBadge) return

    if (favoriteKeys.length > 0) {
      Promise.resolve(badgeNavigator.setAppBadge?.(favoriteKeys.length)).catch(() => undefined)
      return
    }

    Promise.resolve(badgeNavigator.clearAppBadge?.()).catch(() => undefined)
  }, [favoriteKeys.length])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setShowReconnectHint(true)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      reconnectTimerRef.current = window.setTimeout(() => setShowReconnectHint(false), 2200)

      if (!isRefreshingCatalog && (syncState.isStale || syncState.source === 'cache')) {
        setCatalogReloadKey((current) => current + 1)
      }
    }

    function handleOffline() {
      setIsOnline(false)
      setShowReconnectHint(false)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isRefreshingCatalog, syncState.isStale, syncState.source])

  useEffect(() => {
    const syncFileHandoff = () => setFileHandoff(loadDocumentHandoff())
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFileHandoff()
      }
    }

    window.addEventListener('focus', syncFileHandoff)
    window.addEventListener('pageshow', syncFileHandoff)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', syncFileHandoff)
      window.removeEventListener('pageshow', syncFileHandoff)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const syncLabel = useMemo(() => {
    const relative = formatRelativeSyncTime(syncState.updatedAt)
    if (syncState.isStale) {
      return `Каталог сохранён на устройстве. Обновляли ${relative}`
    }
    if (syncState.source === 'cache') {
      return `Каталог на устройстве. Обновляли ${relative}`
    }
    return `Обновляли ${relative}`
  }, [syncState])
  const recentDocuments = useMemo(() => {
    const byKey = new Map(documents.map((doc) => [documentKey(doc), doc]))
    return recentKeys.map((key) => byKey.get(key)).filter(Boolean) as CatalogDocument[]
  }, [documents, recentKeys])
  const handoffDocument = useMemo(() => {
    if (!fileHandoff) return null
    return documents.find((doc) => documentKey(doc) === fileHandoff.key) ?? null
  }, [documents, fileHandoff])

  function flashToast(nextToast: ToastState) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast(nextToast)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800)
  }

  function handleToggleFavorite(doc: CatalogDocument) {
    setFavoriteKeys((current) => {
      const key = documentKey(doc)
      const exists = current.includes(key)
      const next = toggleFavorite(current, key)

      flashToast({
        message: exists ? 'Убрано из избранного' : 'Добавлено в избранное',
        tone: exists ? 'removed' : 'saved',
        actionLabel: 'Отменить',
        onAction: () => {
          setFavoriteKeys((latest) =>
            exists
              ? latest.includes(key)
                ? latest
                : [key, ...latest]
              : latest.filter((item) => item !== key),
          )
          setToast(null)
        },
      })

      return next
    })
  }

  function handleOpenDocument(doc: CatalogDocument) {
    setRecentKeys((current) => rememberRecent(current, documentKey(doc)))
  }

  function handleRememberSearchQuery(query: string) {
    setRecentSearches((current) => rememberSearchQuery(current, query))
  }

  function handleClearRecent() {
    setRecentKeys([])
    flashToast({
      message: 'Недавние очищены',
      tone: 'removed',
    })
  }

  function handleClearRecentSearches() {
    setRecentSearches([])
    flashToast({
      message: 'История поиска очищена',
      tone: 'removed',
    })
  }

  function handleClearFileHandoff() {
    clearDocumentHandoff()
    setFileHandoff(null)
  }

  function handleRefreshCatalog() {
    if (!isOnline || isRefreshingCatalog) return
    setCatalogReloadKey((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <div className="app-shell__veil" />
      <div className="app-shell__grain" />
      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.997 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <CatalogScreen
                    documents={documents}
                    favoriteKeys={favoriteKeys}
                  isLoading={isLoading}
                  error={error}
                  syncState={syncState}
                  syncLabel={syncLabel}
                  isOnline={isOnline}
                  isRefreshing={isRefreshingCatalog}
                  recentDocuments={recentDocuments}
                  recentSearches={recentSearches}
                  fileHandoff={fileHandoff}
                  handoffDocument={handoffDocument}
                  onClearFileHandoff={handleClearFileHandoff}
                  onClearRecentSearches={handleClearRecentSearches}
                  onOpenDocument={handleOpenDocument}
                  onRememberSearchQuery={handleRememberSearchQuery}
                  onRefreshCatalog={handleRefreshCatalog}
                  onToggleFavorite={handleToggleFavorite}
                />
              }
            />
              <Route path="/categories" element={<CategoriesScreen documents={documents} isLoading={isLoading} />} />
              <Route
                path="/favorites"
                element={
                  <FavoritesScreen
                    documents={documents}
                    favoriteKeys={favoriteKeys}
                    recentDocuments={recentDocuments}
                    isLoading={isLoading}
                    onClearRecent={handleClearRecent}
                    onOpenDocument={handleOpenDocument}
                    onToggleFavorite={handleToggleFavorite}
                  />
                }
              />
              <Route path="/order" element={<OrderScreen isOnline={isOnline} />} />
              <Route path="/support" element={<SupportScreen />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {transitionPath ? (
            <motion.div
              className="route-skeleton-shell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <RouteTransitionSkeleton pathname={transitionPath} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {!isOnline || showReconnectHint ? (
          <motion.div
            className={!isOnline ? 'connection-pill connection-pill--offline' : 'connection-pill connection-pill--online'}
            initial={{ opacity: 0, y: -14, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -14, x: '-50%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="connection-pill__icon">
              {!isOnline ? <CloudOff size={14} strokeWidth={2.3} /> : <Wifi size={14} strokeWidth={2.3} />}
            </span>
            <span>
              {!isOnline
                ? 'Нет сети. Работает сохранённый каталог.'
                : isRefreshingCatalog
                  ? 'Сеть вернулась. Обновляем каталог.'
                  : 'Сеть вернулась.'}
            </span>
          </motion.div>
        ) : null}
        {toast ? (
          <motion.div
            className={
              toast.tone === 'saved'
                ? 'app-toast app-toast--saved'
                : toast.tone === 'shared'
                  ? 'app-toast app-toast--shared'
                  : 'app-toast'
            }
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="app-toast__icon">
              {toast.tone === 'saved' ? (
                <Check size={14} strokeWidth={2.4} />
              ) : toast.tone === 'shared' ? (
                <Link2 size={14} strokeWidth={2.25} />
              ) : (
                <Star size={14} strokeWidth={2.2} />
              )}
            </span>
            <span>{toast.message}</span>
            {toast.actionLabel && toast.onAction ? (
              <button type="button" className="app-toast__action" onClick={toast.onAction}>
                {toast.actionLabel}
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <BottomNav favoriteCount={favoriteKeys.length} />
    </div>
  )
}

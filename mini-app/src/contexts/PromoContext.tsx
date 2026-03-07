import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { applyPromoCode } from '../api/userApi'

export interface ActivePromo {
  code: string
  discount: number
  message: string
  activatedAt: number
  validatedAt: number
  expiresAt?: number | null
  userId?: number | null
}

interface PromoContextType {
  activePromo: ActivePromo | null
  isValidating: boolean
  validationError: string | null
  validateAndSetPromo: (code: string) => Promise<boolean>
  clearPromo: () => void
  revalidatePromo: () => Promise<boolean>
  isPromoValid: () => boolean
}

const PromoContext = createContext<PromoContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_active_promo'
const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000

export function usePromo() {
  const context = useContext(PromoContext)
  if (!context) {
    throw new Error('usePromo must be used within PromoProvider')
  }
  return context
}

export function usePromoSafe(): PromoContextType | null {
  return useContext(PromoContext)
}

function getCurrentTelegramUserId(): number | null {
  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  return typeof userId === 'number' ? userId : null
}

function isValidActivePromo(data: unknown): data is ActivePromo {
  if (!data || typeof data !== 'object') {
    return false
  }

  const candidate = data as Record<string, unknown>

  return (
    typeof candidate.code === 'string' &&
    typeof candidate.discount === 'number' &&
    typeof candidate.message === 'string' &&
    typeof candidate.activatedAt === 'number' &&
    typeof candidate.validatedAt === 'number' &&
    candidate.code.length > 0 &&
    candidate.discount >= 0 &&
    candidate.discount <= 100 &&
    (candidate.expiresAt === undefined || candidate.expiresAt === null || typeof candidate.expiresAt === 'number') &&
    (candidate.userId === undefined || candidate.userId === null || typeof candidate.userId === 'number')
  )
}

function isPromoExpiredOnClient(promo: ActivePromo): boolean {
  return typeof promo.expiresAt === 'number' && promo.expiresAt <= Date.now()
}

function sanitizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 50)
}

function readStoredPromo(currentUserId: number | null): ActivePromo | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const parsed = JSON.parse(saved)
    if (!isValidActivePromo(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (isPromoExpiredOnClient(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (currentUserId && parsed.userId !== currentUserId) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage cleanup failures.
    }
    return null
  }
}

export function PromoProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => getCurrentTelegramUserId())
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(() => readStoredPromo(getCurrentTelegramUserId()))
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const validationRequestIdRef = useRef(0)

  useEffect(() => {
    if (currentUserId) return

    const intervalId = window.setInterval(() => {
      const nextUserId = getCurrentTelegramUserId()
      if (nextUserId) {
        setCurrentUserId(nextUserId)
        window.clearInterval(intervalId)
      }
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [currentUserId])

  useEffect(() => {
    if (!activePromo || !currentUserId) return

    if (activePromo.userId !== currentUserId) {
      setActivePromo(null)
      setValidationError(null)
    }
  }, [activePromo, currentUserId])

  useEffect(() => {
    try {
      if (activePromo) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activePromo))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage write failures.
    }
  }, [activePromo])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return

      if (!e.newValue) {
        setActivePromo(null)
        setValidationError(null)
        return
      }

      try {
        const parsed = JSON.parse(e.newValue)
        if (!isValidActivePromo(parsed)) return
        if (isPromoExpiredOnClient(parsed)) return
        if (currentUserId && parsed.userId !== currentUserId) return

        setActivePromo(parsed)
        setValidationError(null)
      } catch {
        // Ignore invalid sync payloads.
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [currentUserId])

  const validateAndSetPromo = useCallback(async (code: string): Promise<boolean> => {
    const normalizedCode = sanitizePromoCode(code)

    if (!normalizedCode) {
      setValidationError('Введите промокод')
      return false
    }

    if (
      activePromo &&
      activePromo.code === normalizedCode &&
      !isPromoExpiredOnClient(activePromo) &&
      (!currentUserId || activePromo.userId === currentUserId)
    ) {
      setValidationError(null)
      return true
    }

    const requestId = validationRequestIdRef.current + 1
    validationRequestIdRef.current = requestId
    setIsValidating(true)
    setValidationError(null)

    try {
      const result = await applyPromoCode(normalizedCode)

      if (requestId !== validationRequestIdRef.current) {
        return false
      }

      if (result.success && typeof result.discount === 'number') {
        const promoUserId = currentUserId ?? getCurrentTelegramUserId()
        setActivePromo({
          code: normalizedCode,
          discount: result.discount,
          message: result.message,
          activatedAt: Date.now(),
          validatedAt: Date.now(),
          expiresAt: result.valid_until ? new Date(result.valid_until).getTime() : null,
          userId: promoUserId,
        })
        setValidationError(null)

        try {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        } catch {
          // Ignore Telegram haptic failures.
        }

        return true
      }

      setValidationError(result.message || 'Промокод недействителен')

      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
      } catch {
        // Ignore Telegram haptic failures.
      }

      return false
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Ошибка проверки промокода')
      return false
    } finally {
      if (requestId === validationRequestIdRef.current) {
        setIsValidating(false)
      }
    }
  }, [activePromo, currentUserId])

  const revalidatePromo = useCallback(async (): Promise<boolean> => {
    if (!activePromo) {
      return true
    }

    if (isPromoExpiredOnClient(activePromo)) {
      setActivePromo(null)
      setValidationError('Срок действия промокода истёк')
      return false
    }

    if (currentUserId && activePromo.userId && activePromo.userId !== currentUserId) {
      setActivePromo(null)
      setValidationError(null)
      return false
    }

    const requestId = validationRequestIdRef.current + 1
    validationRequestIdRef.current = requestId
    setIsValidating(true)

    try {
      const result = await applyPromoCode(activePromo.code)

      if (requestId !== validationRequestIdRef.current) {
        return false
      }

      if (result.success && typeof result.discount === 'number') {
        const promoUserId = currentUserId ?? activePromo.userId ?? getCurrentTelegramUserId()
        setActivePromo((prev) => {
          if (!prev || prev.code !== activePromo.code) return prev

          return {
            ...prev,
            discount: result.discount,
            message: result.message,
            validatedAt: Date.now(),
            expiresAt: result.valid_until ? new Date(result.valid_until).getTime() : prev.expiresAt,
            userId: promoUserId,
          }
        })
        setValidationError(null)
        return true
      }

      setActivePromo(null)
      setValidationError(result.message || 'Промокод больше не действителен')

      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning')
      } catch {
        // Ignore Telegram haptic failures.
      }

      return false
    } catch {
      // Keep the promo locally on transient network failures.
      return true
    } finally {
      if (requestId === validationRequestIdRef.current) {
        setIsValidating(false)
      }
    }
  }, [activePromo, currentUserId])

  const clearPromo = useCallback(() => {
    setActivePromo(null)
    setValidationError(null)

    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {
      // Ignore Telegram haptic failures.
    }
  }, [])

  const isPromoValid = useCallback(() => {
    if (!activePromo) return false
    if (isPromoExpiredOnClient(activePromo)) return false
    if (currentUserId && activePromo.userId && activePromo.userId !== currentUserId) return false
    return true
  }, [activePromo, currentUserId])

  useEffect(() => {
    if (!activePromo) return

    const maybeRevalidate = () => {
      if (document.visibilityState === 'hidden') return
      if (isPromoExpiredOnClient(activePromo)) {
        setActivePromo(null)
        setValidationError('Срок действия промокода истёк')
        return
      }
      if (Date.now() - activePromo.validatedAt < REVALIDATION_INTERVAL_MS) return
      void revalidatePromo()
    }

    maybeRevalidate()
    const intervalId = window.setInterval(maybeRevalidate, REVALIDATION_INTERVAL_MS)
    document.addEventListener('visibilitychange', maybeRevalidate)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', maybeRevalidate)
    }
  }, [activePromo, revalidatePromo])

  return (
    <PromoContext.Provider
      value={{
        activePromo,
        isValidating,
        validationError,
        validateAndSetPromo,
        clearPromo,
        revalidatePromo,
        isPromoValid,
      }}
    >
      {children}
    </PromoContext.Provider>
  )
}

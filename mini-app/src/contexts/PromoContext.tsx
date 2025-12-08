import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { applyPromoCode } from '../api/userApi'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROMO CONTEXT — Bulletproof Global Promo Code State Management
//
//  Features:
//  - Debounced validation to prevent spam
//  - Cross-tab synchronization via localStorage events
//  - Re-validation before order submission
//  - Proper expiration handling
//  - Race condition prevention
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActivePromo {
  code: string
  discount: number
  message: string
  activatedAt: number // timestamp when promo was validated
  validatedAt: number // timestamp of last successful validation
  expiresAt?: number | null // timestamp when promo expires (from server)
}

interface PromoContextType {
  // Active promo code (validated and ready to use)
  activePromo: ActivePromo | null

  // Loading state for async validation
  isValidating: boolean

  // Validation error message
  validationError: string | null

  // Actions
  validateAndSetPromo: (code: string) => Promise<boolean>
  clearPromo: () => void
  revalidatePromo: () => Promise<boolean>

  // Helper to check if promo is still valid (not expired locally)
  isPromoValid: () => boolean
}

const PromoContext = createContext<PromoContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_active_promo'
const PROMO_EXPIRY_HOURS = 24 // Promo expires after 24 hours of inactivity
const DEBOUNCE_MS = 500 // Debounce validation requests
const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000 // Re-validate every 5 minutes

export function usePromo() {
  const context = useContext(PromoContext)
  if (!context) {
    throw new Error('usePromo must be used within PromoProvider')
  }
  return context
}

// Safe hook that doesn't throw
export function usePromoSafe(): PromoContextType | null {
  return useContext(PromoContext)
}

// Validate that parsed data is a valid ActivePromo object
function isValidActivePromo(data: any): data is ActivePromo {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.code === 'string' &&
    typeof data.discount === 'number' &&
    typeof data.message === 'string' &&
    typeof data.activatedAt === 'number' &&
    typeof data.validatedAt === 'number' &&
    data.code.length > 0 &&
    data.discount >= 0 &&
    data.discount <= 100
  )
}

export function PromoProvider({ children }: { children: ReactNode }) {
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(() => {
    // Load saved promo from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)

        // Validate the parsed data
        if (!isValidActivePromo(parsed)) {
          console.warn('[PromoContext] Invalid promo data in localStorage, clearing:', parsed)
          localStorage.removeItem(STORAGE_KEY)
          return null
        }

        // Check if promo has expired (24 hours from activation)
        const hoursElapsed = (Date.now() - parsed.activatedAt) / (1000 * 60 * 60)
        if (hoursElapsed < PROMO_EXPIRY_HOURS) {
          console.log('[PromoContext] Restored promo from localStorage:', parsed.code)
          return parsed
        }
        // Clear expired promo
        console.log('[PromoContext] Promo expired, clearing:', parsed.code)
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      // Log storage errors for debugging
      console.error('[PromoContext] Failed to load promo from localStorage:', err)
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore errors when clearing
      }
    }
    return null
  })

  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Refs for debouncing and preventing race conditions
  const debounceTimerRef = useRef<number | null>(null)
  const validationInProgressRef = useRef<string | null>(null)

  // Save to localStorage whenever activePromo changes
  useEffect(() => {
    try {
      if (activePromo) {
        const serialized = JSON.stringify(activePromo)
        localStorage.setItem(STORAGE_KEY, serialized)
        console.log('[PromoContext] Saved promo to localStorage:', activePromo.code)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        console.log('[PromoContext] Cleared promo from localStorage')
      }
    } catch (err) {
      // Log storage errors for debugging
      console.error('[PromoContext] Failed to save promo to localStorage:', err)
      console.error('[PromoContext] Promo data:', activePromo)
    }
  }, [activePromo])

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue)

            // Validate the parsed data
            if (!isValidActivePromo(parsed)) {
              console.warn('[PromoContext] Invalid promo data from storage event, ignoring')
              return
            }

            // Check expiration
            const hoursElapsed = (Date.now() - parsed.activatedAt) / (1000 * 60 * 60)
            if (hoursElapsed < PROMO_EXPIRY_HOURS) {
              console.log('[PromoContext] Promo synced from another tab:', parsed.code)
              setActivePromo(parsed)
              setValidationError(null)
            }
          } else {
            // Promo was cleared in another tab
            console.log('[PromoContext] Promo cleared in another tab')
            setActivePromo(null)
            setValidationError(null)
          }
        } catch (err) {
          // Log parse errors for debugging
          console.error('[PromoContext] Failed to parse storage event:', err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Validate and set promo code (with debounce)
  const validateAndSetPromo = useCallback(async (code: string): Promise<boolean> => {
    const normalizedCode = code.trim().toUpperCase()

    if (!normalizedCode) {
      setValidationError('Введите промокод')
      return false
    }

    // Prevent duplicate validation of the same code
    if (validationInProgressRef.current === normalizedCode) {
      return false
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    // Debounce the validation
    return new Promise((resolve) => {
      debounceTimerRef.current = window.setTimeout(async () => {
        validationInProgressRef.current = normalizedCode
        setIsValidating(true)
        setValidationError(null)

        try {
          const result = await applyPromoCode(normalizedCode)

          // Check if another validation started while we were waiting
          if (validationInProgressRef.current !== normalizedCode) {
            resolve(false)
            return
          }

          if (result.success && result.discount) {
            const newPromo: ActivePromo = {
              code: normalizedCode,
              discount: result.discount,
              message: result.message,
              activatedAt: Date.now(),
              validatedAt: Date.now(),
              expiresAt: result.valid_until ? new Date(result.valid_until).getTime() : null,
            }
            setActivePromo(newPromo)
            setValidationError(null)

            // Haptic feedback on success
            const tg = window.Telegram?.WebApp
            if (tg?.HapticFeedback) {
              tg.HapticFeedback.notificationOccurred('success')
            }

            resolve(true)
          } else {
            setValidationError(result.message || 'Промокод недействителен')

            // Haptic feedback on error
            const tg = window.Telegram?.WebApp
            if (tg?.HapticFeedback) {
              tg.HapticFeedback.notificationOccurred('error')
            }

            resolve(false)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Ошибка проверки промокода'
          setValidationError(message)
          resolve(false)
        } finally {
          setIsValidating(false)
          validationInProgressRef.current = null
        }
      }, DEBOUNCE_MS)
    })
  }, [])

  // Re-validate currently active promo (for use before order submission)
  const revalidatePromo = useCallback(async (): Promise<boolean> => {
    if (!activePromo) {
      return true // No promo to validate
    }

    // Check local expiration first
    const hoursElapsed = (Date.now() - activePromo.activatedAt) / (1000 * 60 * 60)
    if (hoursElapsed >= PROMO_EXPIRY_HOURS) {
      setActivePromo(null)
      setValidationError('Промокод истёк. Попробуйте ввести снова.')
      return false
    }

    // Skip API call if recently validated (within last 5 minutes)
    const timeSinceLastValidation = Date.now() - activePromo.validatedAt
    if (timeSinceLastValidation < REVALIDATION_INTERVAL_MS) {
      return true
    }

    // Re-validate with server
    setIsValidating(true)
    try {
      const result = await applyPromoCode(activePromo.code)

      if (result.success && result.discount) {
        // Update validation timestamp
        setActivePromo({
          ...activePromo,
          validatedAt: Date.now(),
          discount: result.discount, // Update discount in case it changed
          expiresAt: result.valid_until ? new Date(result.valid_until).getTime() : activePromo.expiresAt,
        })
        return true
      } else {
        // Promo is no longer valid
        setActivePromo(null)
        setValidationError(result.message || 'Промокод больше не действителен')

        // Haptic feedback
        const tg = window.Telegram?.WebApp
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('warning')
        }

        return false
      }
    } catch (err) {
      // Network error - keep the promo but mark as potentially stale
      console.warn('[PromoContext] Revalidation failed:', err)
      // Don't clear the promo on network error - let the server handle it at order time
      return true
    } finally {
      setIsValidating(false)
    }
  }, [activePromo])

  // Clear promo code
  const clearPromo = useCallback(() => {
    setActivePromo(null)
    setValidationError(null)

    // Light haptic feedback
    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light')
    }
  }, [])

  // Check if promo is still valid (local expiration check only)
  const isPromoValid = useCallback(() => {
    if (!activePromo) return false
    const hoursElapsed = (Date.now() - activePromo.activatedAt) / (1000 * 60 * 60)
    return hoursElapsed < PROMO_EXPIRY_HOURS
  }, [activePromo])

  // Periodic expiration check
  useEffect(() => {
    if (!activePromo) return

    const checkExpiration = () => {
      const hoursElapsed = (Date.now() - activePromo.activatedAt) / (1000 * 60 * 60)
      if (hoursElapsed >= PROMO_EXPIRY_HOURS) {
        setActivePromo(null)
        setValidationError('Промокод истёк')
      }
    }

    // Check every minute
    const interval = setInterval(checkExpiration, 60 * 1000)
    return () => clearInterval(interval)
  }, [activePromo])

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

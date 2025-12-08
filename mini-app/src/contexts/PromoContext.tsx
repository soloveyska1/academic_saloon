import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { applyPromoCode } from '../api/userApi'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROMO CONTEXT — Global Promo Code State Management
//  Stores validated promo codes to be used across pages
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActivePromo {
  code: string
  discount: number
  message: string
  activatedAt: number // timestamp
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

  // Helper to check if promo is still valid (not expired)
  isPromoValid: () => boolean
}

const PromoContext = createContext<PromoContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_active_promo'
const PROMO_EXPIRY_HOURS = 24 // Promo expires after 24 hours of inactivity

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

export function PromoProvider({ children }: { children: ReactNode }) {
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(() => {
    // Load saved promo from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ActivePromo
        // Check if promo has expired (24 hours)
        const hoursElapsed = (Date.now() - parsed.activatedAt) / (1000 * 60 * 60)
        if (hoursElapsed < PROMO_EXPIRY_HOURS) {
          return parsed
        }
        // Clear expired promo
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors
    }
    return null
  })

  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Save to localStorage whenever activePromo changes
  useEffect(() => {
    try {
      if (activePromo) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activePromo))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors
    }
  }, [activePromo])

  // Validate and set promo code
  const validateAndSetPromo = useCallback(async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      setValidationError('Введите промокод')
      return false
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const result = await applyPromoCode(code.trim().toUpperCase())

      if (result.success && result.discount) {
        const newPromo: ActivePromo = {
          code: code.trim().toUpperCase(),
          discount: result.discount,
          message: result.message,
          activatedAt: Date.now(),
        }
        setActivePromo(newPromo)
        setValidationError(null)

        // Haptic feedback on success
        const tg = window.Telegram?.WebApp
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success')
        }

        return true
      } else {
        setValidationError(result.message || 'Промокод недействителен')

        // Haptic feedback on error
        const tg = window.Telegram?.WebApp
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('error')
        }

        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка проверки промокода'
      setValidationError(message)
      return false
    } finally {
      setIsValidating(false)
    }
  }, [])

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

  // Check if promo is still valid
  const isPromoValid = useCallback(() => {
    if (!activePromo) return false
    const hoursElapsed = (Date.now() - activePromo.activatedAt) / (1000 * 60 * 60)
    return hoursElapsed < PROMO_EXPIRY_HOURS
  }, [activePromo])

  return (
    <PromoContext.Provider
      value={{
        activePromo,
        isValidating,
        validationError,
        validateAndSetPromo,
        clearPromo,
        isPromoValid,
      }}
    >
      {children}
    </PromoContext.Provider>
  )
}

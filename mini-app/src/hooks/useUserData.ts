import { useState, useEffect, useCallback, useMemo } from 'react'
import { UserData } from '../types'
import { fetchUserData, fetchConfig } from '../api/userApi'
import { SUPPORT_TELEGRAM_URL } from '../lib/appLinks'
import { useAdmin } from '../contexts/AdminContext'

// Demo mode flag - same as in userApi.ts
const IS_DEV = import.meta.env.DEV || false
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || IS_DEV

// Wait until Telegram injects initData.
// On some mobile clients initData arrives a bit later than the first render,
// which caused the app to throw "Open via Telegram" before WebApp was ready.
async function waitForTelegramContext(timeoutMs = 7000, pollMs = 50) {
  // Skip waiting in demo mode - allow mock data
  if (DEMO_MODE) {
    // Quick check - if Telegram is available, use it
    const tg = window.Telegram?.WebApp
    if (tg?.initData && tg?.initData.length > 0) return true
    // Otherwise proceed without Telegram (mock mode)
    return false
  }

  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const tg = window.Telegram?.WebApp
    if (tg?.initData && tg?.initData.length > 0) return true
    await new Promise(resolve => setTimeout(resolve, pollMs))
  }

  return false
}

export function useUserData() {
  const admin = useAdmin()
  const [rawUserData, setRawUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)

        // Wait for Telegram to provide initData (mobile webviews may delay it)
        const hasContext = await waitForTelegramContext()

        // In demo mode, proceed even without Telegram context
        if (!hasContext && !DEMO_MODE) {
          throw new Error('Откройте приложение через Telegram (контекст не готов)')
        }

        const data = await fetchUserData()
        setRawUserData(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const refetch = async () => {
    try {
      const data = await fetchUserData()
      setRawUserData(data)
    } catch {
      // Silent refetch failure - user data stays unchanged
    }
  }

  const userData = useMemo(() => {
    if (!rawUserData) return null
    if (!admin.simulateNewUser) return rawUserData

    return {
      ...rawUserData,
      balance: 0,
      bonus_balance: 0,
      transactions: [],
      orders_count: 0,
      total_spent: 0,
      referrals_count: 0,
      referral_earnings: 0,
      orders: [],
      daily_luck_available: true,
      daily_bonus_streak: 0,
      free_spins: 0,
      rank: {
        name: 'Новый клиент',
        emoji: '✦',
        level: 1,
        cashback: 0,
        bonus: null,
        next_rank: rawUserData.rank.next_rank,
        progress: 0,
        spent_to_next: rawUserData.rank.spent_to_next || 5000,
        is_max: false,
      },
      loyalty: {
        status: 'Новый клиент',
        emoji: '✦',
        level: 1,
        discount: 0,
        orders_to_next: Math.max(rawUserData.loyalty.orders_to_next || 3, 1),
      },
      bonus_expiry: {
        has_expiry: false,
        balance: 0,
        status: 'ok',
        status_text: 'Бонусный баланс пока пустой',
        color: '#9ca3af',
      },
    }
  }, [admin.simulateNewUser, rawUserData])

  return { userData, loading, error, refetch }
}

// Bot username - правильное имя!
const BOT_USERNAME = 'Kladovaya_GIPSR_bot'

export function useTelegram() {
  // Memoize tg reference - stable across renders
  const tg = useMemo(() => window.Telegram?.WebApp, [])
  const [botUsername, setBotUsername] = useState(BOT_USERNAME)

  // Load config on mount
  useEffect(() => {
    fetchConfig().then(config => {
      if (config.bot_username) {
        setBotUsername(config.bot_username)
      }
    }).catch(() => {
      // Keep default
    })
  }, [])

  // Memoize all callbacks to prevent infinite re-render loops
  // Smart haptic that routes to correct Telegram API based on type
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    try {
      const hf = tg?.HapticFeedback
      if (!hf) return

      // Route notification types to notificationOccurred
      if (type === 'success' || type === 'warning' || type === 'error') {
        hf.notificationOccurred(type)
      } else {
        // Route impact types to impactOccurred
        hf.impactOccurred(type)
      }
    } catch {
      // Silently ignore haptic errors (can happen in non-Telegram contexts)
    }
  }, [tg])

  const hapticSuccess = useCallback(() => {
    try {
      tg?.HapticFeedback?.notificationOccurred('success')
    } catch {
      // Silently ignore
    }
  }, [tg])

  const hapticError = useCallback(() => {
    try {
      tg?.HapticFeedback?.notificationOccurred('error')
    } catch {
      // Silently ignore
    }
  }, [tg])

  const openBot = useCallback((startParam?: string) => {
    try {
      const url = startParam
        ? `https://t.me/${botUsername}?start=${startParam}`
        : `https://t.me/${botUsername}`
      tg?.openTelegramLink(url)
    } catch {
      // Fallback to regular link opening
      const url = startParam
        ? `https://t.me/${botUsername}?start=${startParam}`
        : `https://t.me/${botUsername}`
      window.open(url, '_blank')
    }
  }, [tg, botUsername])

  const openSupport = useCallback(() => {
    try {
      tg?.openTelegramLink(SUPPORT_TELEGRAM_URL)
    } catch {
      window.open(SUPPORT_TELEGRAM_URL, '_blank', 'noopener,noreferrer')
    }
  }, [tg])

  const showAlert = useCallback((message: string) => {
    try {
      tg?.showAlert(message)
    } catch {
      alert(message)
    }
  }, [tg])

  const showConfirm = useCallback((message: string, callback: (confirmed: boolean) => void) => {
    try {
      tg?.showConfirm(message, callback)
    } catch {
      callback(window.confirm(message))
    }
  }, [tg])

  const close = useCallback(() => {
    try {
      tg?.close()
    } catch {
      // Cannot close outside Telegram
    }
  }, [tg])

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    initData: tg?.initData,
    botUsername,
    haptic,
    hapticSuccess,
    hapticError,
    openBot,
    openSupport,
    showAlert,
    showConfirm,
    close,
  }
}

import { useState, useEffect, useCallback, useMemo } from 'react'
import { UserData } from '../types'
import { fetchUserData, fetchConfig } from '../api/userApi'

// Wait until Telegram injects initData.
// On some mobile clients initData arrives a bit later than the first render,
// which caused the app to throw "Open via Telegram" before WebApp was ready.
async function waitForTelegramContext(timeoutMs = 7000, pollMs = 50) {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const tg = window.Telegram?.WebApp
    if (tg?.initData && tg?.initData.length > 0) return true
    await new Promise(resolve => setTimeout(resolve, pollMs))
  }

  return false
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)

        // Wait for Telegram to provide initData (mobile webviews may delay it)
        const hasContext = await waitForTelegramContext()
        if (!hasContext) {
          throw new Error('Откройте приложение через Telegram (контекст не готов)')
        }

        const data = await fetchUserData()
        setUserData(data)
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
      setUserData(data)
    } catch (err) {
      console.error('Refetch error:', err)
    }
  }

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
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type)
  }, [tg])

  const hapticSuccess = useCallback(() => {
    tg?.HapticFeedback?.notificationOccurred('success')
  }, [tg])

  const hapticError = useCallback(() => {
    tg?.HapticFeedback?.notificationOccurred('error')
  }, [tg])

  const openBot = useCallback((startParam?: string) => {
    const url = startParam
      ? `https://t.me/${botUsername}?start=${startParam}`
      : `https://t.me/${botUsername}`
    tg?.openTelegramLink(url)
  }, [tg, botUsername])

  const openSupport = useCallback(() => {
    // Open bot with support command to create topic
    const url = `https://t.me/${botUsername}?start=support`
    tg?.openTelegramLink(url)
  }, [tg, botUsername])

  const showAlert = useCallback((message: string) => {
    tg?.showAlert(message)
  }, [tg])

  const showConfirm = useCallback((message: string, callback: (confirmed: boolean) => void) => {
    tg?.showConfirm(message, callback)
  }, [tg])

  const close = useCallback(() => {
    tg?.close()
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

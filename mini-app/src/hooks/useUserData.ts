import { useState, useEffect } from 'react'
import { UserData } from '../types'
import { fetchUserData, fetchConfig } from '../api/userApi'

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)
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
  const tg = window.Telegram?.WebApp
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

  const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type)
  }

  const hapticSuccess = () => {
    tg?.HapticFeedback?.notificationOccurred('success')
  }

  const hapticError = () => {
    tg?.HapticFeedback?.notificationOccurred('error')
  }

  const openBot = (startParam?: string) => {
    const url = startParam
      ? `https://t.me/${botUsername}?start=${startParam}`
      : `https://t.me/${botUsername}`
    tg?.openTelegramLink(url)
  }

  const openSupport = () => {
    tg?.openTelegramLink('https://t.me/Thisissaymoon')
  }

  const showAlert = (message: string) => {
    tg?.showAlert(message)
  }

  const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    tg?.showConfirm(message, callback)
  }

  const close = () => {
    tg?.close()
  }

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

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchGodSystemInfo } from '../api/userApi'
const DEV_ADMIN_ID = 872379852

interface AdminSettings {
  isAdmin: boolean
  telegramId: number | null
  debugMode: boolean
  simulateNewUser: boolean
  showDebugInfo: boolean
  // bypassPayments removed for security - payments must always go through server validation
}

interface AdminContextType extends AdminSettings {
  accessResolved: boolean
  toggleDebugMode: () => void
  toggleSimulateNewUser: () => void
  toggleShowDebugInfo: () => void
  resetAllSettings: () => void
  simulatedRank: number | null
  setSimulatedRank: (rank: number | null) => void
}

const defaultSettings: AdminSettings = {
  isAdmin: false,
  telegramId: null,
  debugMode: false,
  simulateNewUser: false,
  showDebugInfo: false,
}

const AdminContext = createContext<AdminContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_admin_settings'
const MAX_ATTEMPTS = 20

type PersistedAdminSettings = Pick<AdminSettings, 'debugMode' | 'simulateNewUser' | 'showDebugInfo'>

function getPersistedSettings(): PersistedAdminSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        debugMode: Boolean(parsed.debugMode),
        simulateNewUser: Boolean(parsed.simulateNewUser),
        showDebugInfo: Boolean(parsed.showDebugInfo),
      }
    }
  } catch {
    // Ignore parse errors
  }

  return {
    debugMode: false,
    simulateNewUser: false,
    showDebugInfo: false,
  }
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

// Helper hook to check if admin without throwing
export function useIsAdmin() {
  const context = useContext(AdminContext)
  return context?.isAdmin ?? false
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    return { ...defaultSettings, ...getPersistedSettings() }
  })
  const [accessResolved, setAccessResolved] = useState(false)
  const [simulatedRank, setSimulatedRank] = useState<number | null>(null)

  // Check if current user is admin with retry logic
  useEffect(() => {
    let attempts = 0
    let cancelled = false
    let intervalId: number | null = null

    const resolveAccess = (next: Partial<AdminSettings>) => {
      if (cancelled) return true
      setSettings(prev => ({ ...prev, ...next }))
      setAccessResolved(true)
      return true
    }

    const checkAdmin = async () => {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      const userId = tgUser?.id

      if (userId) {
        try {
          const systemInfo = await fetchGodSystemInfo()
          return resolveAccess({
            isAdmin: systemInfo.admin_ids.includes(userId),
            telegramId: userId,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          const isPermissionFailure = /доступ|access denied|not a god|403/i.test(message)
          if (isPermissionFailure || attempts >= MAX_ATTEMPTS) {
            return resolveAccess({ isAdmin: false, telegramId: userId })
          }
          return false
        }
      }

      // Fallback only for local development
      if (import.meta.env.DEV) {
        return resolveAccess({ isAdmin: true, telegramId: DEV_ADMIN_ID })
      }

      if (!window.Telegram?.WebApp) {
        return resolveAccess({ isAdmin: false, telegramId: null })
      }

      if (attempts >= MAX_ATTEMPTS) {
        return resolveAccess({ isAdmin: false, telegramId: null })
      }

      return false
    }

    // Try immediately
    void checkAdmin().then((resolved) => {
      if (resolved || cancelled) return

      intervalId = window.setInterval(() => {
        attempts++
        void checkAdmin().then((done) => {
          if ((done || attempts >= MAX_ATTEMPTS) && intervalId !== null) {
            window.clearInterval(intervalId)
            intervalId = null
          }
        })
      }, 100)
    })

    return () => {
      cancelled = true
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      const persisted: PersistedAdminSettings = {
        debugMode: settings.debugMode,
        simulateNewUser: settings.simulateNewUser,
        showDebugInfo: settings.showDebugInfo,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    } catch {
      // Ignore storage errors
    }
  }, [settings])

  const toggleDebugMode = () => {
    setSettings(prev => ({ ...prev, debugMode: !prev.debugMode }))
  }

  const toggleSimulateNewUser = () => {
    setSettings(prev => ({ ...prev, simulateNewUser: !prev.simulateNewUser }))
  }

  const toggleShowDebugInfo = () => {
    setSettings(prev => ({ ...prev, showDebugInfo: !prev.showDebugInfo }))
  }

  const resetAllSettings = () => {
    setSettings(prev => ({
      ...defaultSettings,
      isAdmin: prev.isAdmin, // Keep admin status
    }))
  }

  return (
    <AdminContext.Provider
      value={{
        ...settings,
        accessResolved,
        toggleDebugMode,
        toggleSimulateNewUser,
        toggleShowDebugInfo,
        resetAllSettings,
        simulatedRank,
        setSimulatedRank,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

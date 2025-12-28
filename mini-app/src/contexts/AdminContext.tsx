import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Admin Telegram IDs
const ADMIN_IDS = [
  872379852, // Main admin
]

interface AdminSettings {
  isAdmin: boolean
  telegramId: number | null
  debugMode: boolean
  simulateNewUser: boolean
  unlimitedRoulette: boolean
  showDebugInfo: boolean
  // bypassPayments removed for security - payments must always go through server validation
}

interface AdminContextType extends AdminSettings {
  toggleDebugMode: () => void
  toggleSimulateNewUser: () => void
  toggleUnlimitedRoulette: () => void
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
  unlimitedRoulette: false,
  showDebugInfo: false,
}

const AdminContext = createContext<AdminContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_admin_settings'

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
    // Load saved settings from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultSettings, ...parsed }
      }
    } catch {
      // Ignore parse errors
    }
    return defaultSettings
  })

  const [simulatedRank, setSimulatedRank] = useState<number | null>(null)

  // Check if current user is admin with retry logic
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 20 // 2 seconds (100ms * 20)

    const checkAdmin = () => {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      const userId = tgUser?.id

      if (userId) {
        const isAdmin = ADMIN_IDS.includes(userId)
        setSettings(prev => ({ ...prev, isAdmin, telegramId: userId }))
        return true
      }

      // Fallback for dev mode
      if (import.meta.env.DEV || !window.Telegram?.WebApp) {
        setSettings(prev => ({ ...prev, isAdmin: true, telegramId: 872379852 })) // Default to admin in dev
        return true
      }

      return false
    }

    // Try immediately
    if (checkAdmin()) return

    // Poll if not ready
    const interval = setInterval(() => {
      attempts++
      if (checkAdmin() || attempts >= maxAttempts) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
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

  const toggleUnlimitedRoulette = () => {
    setSettings(prev => ({ ...prev, unlimitedRoulette: !prev.unlimitedRoulette }))
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
        toggleDebugMode,
        toggleSimulateNewUser,
        toggleUnlimitedRoulette,
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

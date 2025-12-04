import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Admin Telegram IDs
const ADMIN_IDS = [
  872379852, // Main admin
]

interface AdminSettings {
  isAdmin: boolean
  debugMode: boolean
  simulateNewUser: boolean
  unlimitedRoulette: boolean
  showDebugInfo: boolean
  bypassPayments: boolean
}

interface AdminContextType extends AdminSettings {
  toggleDebugMode: () => void
  toggleSimulateNewUser: () => void
  toggleUnlimitedRoulette: () => void
  toggleShowDebugInfo: () => void
  toggleBypassPayments: () => void
  resetAllSettings: () => void
}

const defaultSettings: AdminSettings = {
  isAdmin: false,
  debugMode: false,
  simulateNewUser: false,
  unlimitedRoulette: false,
  showDebugInfo: false,
  bypassPayments: false,
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

  // Check if current user is admin
  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    const userId = tgUser?.id

    // Check if user is in admin list OR if running in dev mode without Telegram
    const isAdmin = userId
      ? ADMIN_IDS.includes(userId)
      : process.env.NODE_ENV === 'development' || !window.Telegram?.WebApp

    setSettings(prev => ({ ...prev, isAdmin }))
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

  const toggleBypassPayments = () => {
    setSettings(prev => ({ ...prev, bypassPayments: !prev.bypassPayments }))
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
        toggleBypassPayments,
        resetAllSettings,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

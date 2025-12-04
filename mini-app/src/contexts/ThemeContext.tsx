import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'academic_saloon_theme'

// Get theme colors for Telegram WebApp
// IMPORTANT: Sync header with bg-base, not black — prevents visual "seam"
const getThemeColors = (theme: Theme) => ({
  header: theme === 'dark' ? '#050507' : '#FAFAF9',      // Obsidian Glass / Royal Porcelain
  background: theme === 'dark' ? '#050507' : '#FAFAF9',
})

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// Helper hook that doesn't throw (for optional theme usage)
export function useThemeValue(): Theme {
  const context = useContext(ThemeContext)
  return context?.theme ?? 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load saved theme from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
    } catch {
      // Ignore storage errors
    }
    // Default to dark theme
    return 'dark'
  })

  // Apply theme to document and Telegram
  useEffect(() => {
    // Set data-theme attribute on document root
    document.documentElement.setAttribute('data-theme', theme)

    // Update Telegram WebApp colors
    const tg = window.Telegram?.WebApp
    if (tg) {
      const colors = getThemeColors(theme)
      try {
        tg.setHeaderColor(colors.header as `#${string}`)
        tg.setBackgroundColor(colors.background as `#${string}`)
      } catch (e) {
        console.warn('[Theme] Failed to set Telegram colors:', e)
      }
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', getThemeColors(theme).header)
    }

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage errors
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')

    // Heavy haptic feedback — premium "click" feel like an expensive switch
    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('heavy')
    }
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

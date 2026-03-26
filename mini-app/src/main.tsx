import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/responsive.css'

// Development mode flag
const IS_DEV = import.meta.env.DEV
const THEME_STORAGE_KEY = 'academic_saloon_theme'

function getBootTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch {
    // Ignore storage access failures
  }

  const currentTheme = document.documentElement.getAttribute('data-theme')
  return currentTheme === 'light' ? 'light' : 'dark'
}

function getBootThemeColors(theme: 'dark' | 'light') {
  return theme === 'light'
    ? { header: '#FAFAF9', background: '#FAFAF9' }
    : { header: '#121212', background: '#0A0A0A' }
}

// Global error handler for mobile debugging
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const errorMsg = JSON.stringify({
    msg,
    url,
    line: lineNo,
    col: columnNo,
    stack: error?.stack
  }, null, 2)

  // Create error overlay if it doesn't exist
  let errorDiv = document.getElementById('fatal-error-display')
  if (!errorDiv) {
    errorDiv = document.createElement('div')
    errorDiv.id = 'fatal-error-display'
    errorDiv.style.position = 'fixed'
    errorDiv.style.top = '0'
    errorDiv.style.left = '0'
    errorDiv.style.width = '100%'
    errorDiv.style.height = '100%'
    errorDiv.style.backgroundColor = '#000'
    errorDiv.style.color = '#ff3333'
    errorDiv.style.zIndex = '999999'
    errorDiv.style.padding = '20px'
    errorDiv.style.overflow = 'auto'
    errorDiv.style.fontFamily = 'monospace'
    errorDiv.style.whiteSpace = 'pre-wrap'
    document.body.appendChild(errorDiv)
  }

  errorDiv.textContent = `CRITICAL ERROR\n\n${errorMsg}`
  return false
}

window.addEventListener('unhandledrejection', function (event) {
  const errorMsg = event.reason?.stack || event.reason || 'Unknown Promise Error'

  let errorDiv = document.getElementById('fatal-error-display')
  if (!errorDiv) {
    errorDiv = document.createElement('div')
    errorDiv.id = 'fatal-error-display'
    errorDiv.style.position = 'fixed'
    errorDiv.style.top = '0'
    errorDiv.style.left = '0'
    errorDiv.style.width = '100%'
    errorDiv.style.height = '100%'
    errorDiv.style.backgroundColor = '#000'
    errorDiv.style.color = '#ff3333'
    errorDiv.style.zIndex = '999999'
    errorDiv.style.padding = '20px'
    errorDiv.style.overflow = 'auto'
    errorDiv.style.fontFamily = 'monospace'
    errorDiv.style.whiteSpace = 'pre-wrap'
    document.body.appendChild(errorDiv)
  }

  errorDiv.textContent += `\n\nUNHANDLED PROMISE\n\n${errorMsg}`
})

// Build info for deploy verification
declare const __BUILD_TIME__: string
console.log('[Build]', __BUILD_TIME__)

// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp
const bootTheme = getBootTheme()
const bootColors = getBootThemeColors(bootTheme)

if (tg) {
  tg.ready()
  tg.expand()
  tg.setHeaderColor(bootColors.header)
  tg.setBackgroundColor(bootColors.background)

  // Disable Telegram's pull-to-close gesture so scrolling up works properly
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes()
  }

  // Dev diagnostics only
  if (IS_DEV) {
    console.log('[DEV] Telegram WebApp initialized')
    console.log('[DEV] initData length:', tg.initData?.length || 0)
    console.log('[DEV] User:', tg.initDataUnsafe?.user?.first_name || 'N/A')
  }
} else if (IS_DEV) {
  console.warn('[DEV] Telegram WebApp not available - running in browser mode')
}

// Render React app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

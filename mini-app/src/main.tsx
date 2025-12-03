import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Development mode flag
const IS_DEV = import.meta.env.DEV

// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp

if (tg) {
  tg.ready()
  tg.expand()
  tg.setHeaderColor('#1a1a2e')
  tg.setBackgroundColor('#1a1a2e')

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

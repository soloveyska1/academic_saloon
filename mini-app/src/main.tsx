import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Debug: Log Telegram WebApp state
console.log('[INIT] window.Telegram exists:', !!window.Telegram)
console.log('[INIT] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp)
console.log('[INIT] initData:', window.Telegram?.WebApp?.initData || '(empty)')
console.log('[INIT] initDataUnsafe:', JSON.stringify(window.Telegram?.WebApp?.initDataUnsafe || {}))

// Initialize Telegram Web App
const tg = window.Telegram?.WebApp

if (tg) {
  console.log('[INIT] Calling tg.ready()...')
  tg.ready()
  tg.expand()
  tg.setHeaderColor('#1a1a2e')
  tg.setBackgroundColor('#1a1a2e')
  console.log('[INIT] WebApp initialized, initData length:', tg.initData?.length || 0)
} else {
  console.warn('[INIT] ⚠️ Telegram WebApp NOT available!')
  console.warn('[INIT] This app must be opened from Telegram bot menu button')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

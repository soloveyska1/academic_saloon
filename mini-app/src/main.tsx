import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// ═══════════════════════════════════════════════════════════════
//  TELEGRAM WEBAPP DIAGNOSTIC
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════')
console.log('[INIT] 🔍 Telegram WebApp Diagnostic')
console.log('═══════════════════════════════════════════════════')

// Check URL for tgWebAppData (Telegram passes data via URL hash)
console.log('[INIT] Current URL:', window.location.href)
console.log('[INIT] URL hash:', window.location.hash || '(empty)')
console.log('[INIT] URL search:', window.location.search || '(empty)')

// Check if running inside Telegram iframe
console.log('[INIT] window.parent === window:', window.parent === window)
console.log('[INIT] document.referrer:', document.referrer || '(empty)')

// Check Telegram object
console.log('[INIT] window.Telegram exists:', !!window.Telegram)
console.log('[INIT] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp)

const tg = window.Telegram?.WebApp

if (tg) {
  console.log('[INIT] ✅ Telegram WebApp object found!')
  console.log('[INIT] tg.platform:', tg.platform)
  console.log('[INIT] tg.version:', tg.version)
  console.log('[INIT] tg.initData length:', tg.initData?.length || 0)
  console.log('[INIT] tg.initData:', tg.initData || '(empty)')
  console.log('[INIT] tg.initDataUnsafe:', JSON.stringify(tg.initDataUnsafe || {}, null, 2))

  // Initialize
  console.log('[INIT] Calling tg.ready()...')
  tg.ready()
  tg.expand()
  tg.setHeaderColor('#1a1a2e')
  tg.setBackgroundColor('#1a1a2e')

  // Check again after ready()
  console.log('[INIT] After ready() - initData length:', tg.initData?.length || 0)

  if (!tg.initData) {
    console.error('[INIT] ❌ initData is EMPTY!')
    console.error('[INIT] Possible causes:')
    console.error('  1. App opened via direct URL, not from Telegram')
    console.error('  2. BotFather Menu Button not configured')
    console.error('  3. Web App URL in BotFather doesn\'t match current domain')
    console.error('[INIT] Expected: App should be opened from Telegram bot menu')
  }
} else {
  console.error('[INIT] ❌ Telegram WebApp NOT available!')
  console.error('[INIT] This means:')
  console.error('  1. telegram-web-app.js script not loaded')
  console.error('  2. OR app opened in regular browser, not Telegram')
}

console.log('═══════════════════════════════════════════════════')

// ═══════════════════════════════════════════════════════════════
//  REACT APP RENDER
// ═══════════════════════════════════════════════════════════════

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app'
import './styles.css'
import './order-support-rebalance.css'

type BootWindow = Window & {
  __APP_BOOT_START__?: number
}

const bootSplash = document.getElementById('boot-splash')

function hideBootSplash() {
  if (!bootSplash || bootSplash.dataset.hidden === 'true') return

  const bootStart = Number((window as BootWindow).__APP_BOOT_START__ ?? Date.now())
  const elapsed = Date.now() - bootStart
  const remaining = Math.max(0, 2280 - elapsed)

  window.setTimeout(() => {
    if (!bootSplash || bootSplash.dataset.hidden === 'true') return
    bootSplash.dataset.hidden = 'true'
    bootSplash.classList.add('is-hidden')
    window.setTimeout(() => bootSplash.remove(), 980)
  }, remaining)
}

window.addEventListener('bibliosaloon:app-ready', hideBootSplash, { once: true })
window.setTimeout(hideBootSplash, 6200)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
      .then((registration) => registration.update().catch(() => undefined))
      .catch(() => {
        return undefined
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/app">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

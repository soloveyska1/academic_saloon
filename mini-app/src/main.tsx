import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Initialize Telegram Web App
const tg = window.Telegram?.WebApp

if (tg) {
  tg.ready()
  tg.expand()
  tg.setHeaderColor('#1a1a2e')
  tg.setBackgroundColor('#1a1a2e')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

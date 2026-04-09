import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, PlusSquare, Share2, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_DISMISS_KEY = 'bibliosaloon-library-install-dismissed'

function getStandaloneState() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function getIosSafariState() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|YaBrowser/i.test(ua)
  return isIos && isSafari
}

export function InstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(getStandaloneState)
  const [isIosSafari, setIsIosSafari] = useState(getIosSafariState)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIosSheet, setShowIosSheet] = useState(false)

  useEffect(() => {
    setIsDismissed(window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1')

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1')
      setDeferredPrompt(null)
      setIsStandalone(true)
      setIsDismissed(true)
      setShowIosSheet(false)
    }

    function syncMode() {
      setIsStandalone(getStandaloneState())
      setIsIosSafari(getIosSafariState())
    }

    syncMode()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('focus', syncMode)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('focus', syncMode)
    }
  }, [])

  useEffect(() => {
    if (!showIosSheet) return
    window.document.body.classList.add('has-overlay')
    return () => window.document.body.classList.remove('has-overlay')
  }, [showIosSheet])

  if (location.pathname !== '/' || isStandalone || isDismissed || (!deferredPrompt && !isIosSafari)) {
    return null
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        window.localStorage.setItem(INSTALL_DISMISS_KEY, '1')
        setIsDismissed(true)
      }
      setDeferredPrompt(null)
      return
    }

    setShowIosSheet(true)
  }

  function handleDismiss() {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    setIsDismissed(true)
    setShowIosSheet(false)
  }

  return (
    <>
      <motion.section
        className="install-banner"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="install-banner__copy">
          <span>Добавить на экран</span>
          <strong>Открывай библиотеку как обычное приложение</strong>
          <small>Так она будет открываться как отдельное приложение.</small>
        </div>
        <button type="button" className="install-banner__cta" onClick={handleInstall}>
          <Download size={16} />
          <span>{deferredPrompt ? 'Добавить' : 'Как добавить'}</span>
        </button>
        <button type="button" className="install-banner__dismiss" onClick={handleDismiss} aria-label="Скрыть подсказку">
          <X size={16} />
        </button>
      </motion.section>

      <AnimatePresence>
        {showIosSheet ? (
          <>
            <motion.button
              type="button"
              className="sheet-backdrop"
              onClick={() => setShowIosSheet(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              className="sheet sheet--install"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.16 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 96 || info.velocity.y > 720) {
                  setShowIosSheet(false)
                }
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="sheet__handle" />
              <div className="sheet__header">
                <div>
                  <div className="doc-pill">На главный экран</div>
                  <h2>Как добавить библиотеку</h2>
                  <p>После этого она будет открываться одним нажатием и не потеряется среди вкладок.</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowIosSheet(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="sheet__content">
                <div className="install-steps">
                  <div className="install-step">
                    <div className="install-step__icon">
                      <Share2 size={18} />
                    </div>
                    <div className="install-step__copy">
                      <strong>1. Нажми «Поделиться»</strong>
                      <p>Кнопка находится внизу экрана в Safari.</p>
                    </div>
                  </div>
                  <div className="install-step">
                    <div className="install-step__icon">
                      <PlusSquare size={18} />
                    </div>
                    <div className="install-step__copy">
                      <strong>2. Выбери «На экран Домой»</strong>
                      <p>После этого библиотека появится рядом с обычными приложениями.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sheet__actions">
                <button type="button" className="primary-action primary-action--wide" onClick={handleDismiss}>
                  Понятно
                </button>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { useTelegram } from '../hooks/useUserData'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'

import { SupportHeader } from '../components/support/SupportHeader'
import { SupportQuickHelp } from '../components/support/SupportQuickHelp'
import { SupportFAQ } from '../components/support/SupportFAQ'
import { SupportChatView } from '../components/support/SupportChatView'
import ps from '../styles/PremiumPageSystem.module.css'
import s from './SupportPage.module.css'

export function SupportPage() {
  const { haptic, openSupport } = useTelegram()
  const [searchParams, setSearchParams] = useSearchParams()
  const safeBack = useSafeBackNavigation('/')
  const [expandedFaq, setExpandedFaq] = useState('payment')

  /* ═══════ Computed ═══════ */

  const activeView = useMemo(
    () => (searchParams.get('view') === 'chat' ? 'chat' : 'faq') as 'faq' | 'chat',
    [searchParams],
  )

  /* ═══════ Handlers ═══════ */

  const handleBack = useCallback(() => {
    haptic('light')
    safeBack()
  }, [haptic, safeBack])

  const setView = useCallback(
    (view: 'faq' | 'chat') => {
      setSearchParams({ view })
    },
    [setSearchParams],
  )

  const handleOpenTelegram = useCallback(() => {
    haptic('medium')
    openSupport()
  }, [haptic, openSupport])

  const handleOpenFaq = useCallback(
    (faqId: string) => {
      setExpandedFaq(faqId)
      setView('faq')
      haptic('light')
    },
    [haptic, setView],
  )

  const handleToggleFaq = useCallback(
    (faqId: string) => {
      setExpandedFaq((current) => (current === faqId ? '' : faqId))
      haptic('light')
    },
    [haptic],
  )

  const handleOpenChat = useCallback(() => {
    setView('chat')
  }, [setView])

  /* ═══════ Render ═══════ */

  return (
    <div className="page-full-width saloon-page-shell saloon-page-shell--utility" style={{ minHeight: '100vh' }}>
      <div className="page-background">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div
        className={`page-content saloon-page-content saloon-page-content--wide ${s.pageStack}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          paddingBottom: 120,
        }}
      >
        {/* 1. Header */}
        <SupportHeader onBack={handleBack} onOpenTelegram={handleOpenTelegram} />

        {/* 2. Quick Help + Topic Cards + View Switcher */}
        <SupportQuickHelp
          activeView={activeView}
          onViewChange={setView}
          onOpenFaq={handleOpenFaq}
        />

        {/* 3. Content Section */}
        <div className={`${ps.surface} ${ps.surfaceUtility} ${s.contentSurface}`}>
          {activeView === 'faq' ? (
            <SupportFAQ
              expandedFaq={expandedFaq}
              onToggleFaq={handleToggleFaq}
              onOpenChat={handleOpenChat}
              onOpenTelegram={handleOpenTelegram}
            />
          ) : (
            <SupportChatView onOpenTelegram={handleOpenTelegram} />
          )}
        </div>
      </div>
    </div>
  )
}

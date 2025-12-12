import { memo, useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════════
//  SEGMENTED TABS - Premium sticky tab bar with smooth animations
// ═══════════════════════════════════════════════════════════════════════════════

interface Tab {
  id: string
  label: string
}

interface SegmentedTabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export const SegmentedTabs = memo(function SegmentedTabs({
  tabs,
  activeTab,
  onChange,
}: SegmentedTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Calculate indicator position based on active tab
  useEffect(() => {
    if (!containerRef.current) return

    const activeIndex = tabs.findIndex(t => t.id === activeTab)
    if (activeIndex === -1) return

    const buttons = containerRef.current.querySelectorAll('button')
    const activeButton = buttons[activeIndex] as HTMLButtonElement

    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [activeTab, tabs])

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        paddingTop: 8,
        paddingBottom: 16,
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0a0a0c 85%, transparent 100%)',
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Tab container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'flex',
          padding: 4,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Animated indicator */}
        <motion.div
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)',
          }}
        />

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                try {
                  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
                } catch {}
                onChange(tab.id)
              }}
              style={{
                position: 'relative',
                flex: 1,
                padding: '10px 8px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                zIndex: 1,
              }}
            >
              <motion.span
                animate={{
                  color: isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.5)',
                }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
})

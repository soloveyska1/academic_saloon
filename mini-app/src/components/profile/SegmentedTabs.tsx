import { memo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════════
//  SEGMENTED TABS - Sticky tab bar for profile sections
// ═══════════════════════════════════════════════════════════════════════════════

export type ProfileTabId = 'overview' | 'wallet' | 'vouchers' | 'agent' | 'settings'

interface Tab {
  id: ProfileTabId
  label: string
  visible: boolean
}

interface SegmentedTabsProps {
  tabs: Tab[]
  activeTab: ProfileTabId
  onTabChange: (tab: ProfileTabId) => void
}

export const SegmentedTabs = memo(function SegmentedTabs({
  tabs,
  activeTab,
  onTabChange,
}: SegmentedTabsProps) {
  const visibleTabs = tabs.filter(t => t.visible)

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '12px 0',
        background: 'linear-gradient(180deg, rgba(10, 10, 12, 1) 0%, rgba(10, 10, 12, 0.98) 80%, rgba(10, 10, 12, 0) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '4px',
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                try {
                  window.Telegram?.WebApp.HapticFeedback.selectionChanged()
                } catch {}
                onTabChange(tab.id)
              }}
              style={{
                position: 'relative',
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* Active background */}
              {isActive && (
                <motion.div
                  layoutId="activeProfileTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                  }}
                />
              )}

              {/* Label */}
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.5)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
})

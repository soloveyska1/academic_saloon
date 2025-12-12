import { memo } from 'react'
import { motion } from 'framer-motion'
import { RewardCategory } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  REWARDS FILTER TABS - Category tabs for rewards store
// ═══════════════════════════════════════════════════════════════════════════════

interface Tab {
  id: RewardCategory | 'all'
  label: string
  color: string
}

const TABS: Tab[] = [
  { id: 'all', label: 'Все', color: '#D4AF37' },
  { id: 'free', label: '0₽', color: '#22c55e' },
  { id: 'speed', label: 'Ускорение', color: '#8B5CF6' },
  { id: 'design', label: 'Оформление', color: '#EC4899' },
  { id: 'discount', label: 'Скидки', color: '#F59E0B' },
]

interface RewardsFilterTabsProps {
  activeTab: RewardCategory | 'all'
  onTabChange: (tab: RewardCategory | 'all') => void
  counts?: Record<string, number>
}

export const RewardsFilterTabs = memo(function RewardsFilterTabs({
  activeTab,
  onTabChange,
  counts,
}: RewardsFilterTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '4px 0',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const count = counts?.[tab.id]

        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              try {
                window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
              } catch {}
              onTabChange(tab.id)
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 10,
              border: isActive
                ? `1px solid ${tab.color}50`
                : '1px solid rgba(255, 255, 255, 0.08)',
              background: isActive
                ? `${tab.color}15`
                : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? tab.color : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {tab.label}
            </span>

            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isActive ? `${tab.color}30` : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? tab.color : 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {count}
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  borderRadius: 1,
                  background: tab.color,
                }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
})

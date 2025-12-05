import React from 'react'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  FILTER CHIP — Premium Zero-Latency Touch Component
//  Direct DOM manipulation for instant feedback
// ═══════════════════════════════════════════════════════════════════════════

interface FilterChipProps {
  label: string
  isActive: boolean
  onClick: () => void
}

export const FilterChip = React.memo(({ label, isActive, onClick }: FilterChipProps) => {
  const { ref, handlers } = usePremiumGesture({
    onTap: onClick,
    scale: 0.94,
    hapticType: 'light',
    tolerance: 12,
    pressDelay: 30,
  })

  return (
    <button
      ref={ref}
      {...handlers}
      className={`filter-chip-premium ${isActive ? 'active' : ''}`}
      style={{
        color: isActive ? 'var(--bg-void)' : 'var(--text-muted)',
        background: isActive ? 'var(--gold-metallic)' : 'transparent',
        boxShadow: isActive ? 'var(--glow-gold)' : 'none',
      }}
    >
      {label}
    </button>
  )
})

FilterChip.displayName = 'FilterChip'

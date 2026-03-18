import { memo } from 'react'
import { useThemeValue } from '../../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS CARD STYLES
// ═══════════════════════════════════════════════════════════════════════════

// Note: borderRadius and padding are now responsive via CSS classes
export const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--bg-card)',
  backdropFilter: 'blur(12px) saturate(130%)',
  WebkitBackdropFilter: 'blur(12px) saturate(130%)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
}

export const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  backdropFilter: 'blur(12px) saturate(130%)',
  WebkitBackdropFilter: 'blur(12px) saturate(130%)',
  border: '1px solid var(--border-gold)',
  boxShadow: 'var(--card-shadow)',
}

/** Theme-aware glass gold style factory */
export function getGlassGoldStyle(isDark: boolean): React.CSSProperties {
  return {
    position: 'relative',
    overflow: 'hidden',
    background: isDark
      ? 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)'
      : 'linear-gradient(135deg, rgba(158,122,26,0.06) 0%, var(--bg-card) 40%, rgba(158,122,26,0.03) 100%)',
    backdropFilter: 'blur(12px) saturate(130%)',
    WebkitBackdropFilter: 'blur(12px) saturate(130%)',
    border: '1px solid var(--border-gold)',
    boxShadow: 'var(--card-shadow)',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Modal loading fallback
export const ModalLoadingFallback = memo(function ModalLoadingFallback() {
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  return (
    <div
      aria-hidden="true"
      style={{
      position: 'fixed',
      inset: 0,
      background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(120,113,108,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div
                aria-hidden="true"
                style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '2px solid transparent',
        borderTopColor: isDark ? 'rgba(212,175,55,0.8)' : 'rgba(158,122,26,0.8)',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
})

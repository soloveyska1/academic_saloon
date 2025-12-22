import { memo } from 'react'

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

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Modal loading fallback
export const ModalLoadingFallback = memo(function ModalLoadingFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
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
        borderTopColor: 'rgba(212,175,55,0.8)',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
})

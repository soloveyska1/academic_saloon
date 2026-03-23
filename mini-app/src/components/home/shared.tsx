import { memo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS CARD STYLES
// ═══════════════════════════════════════════════════════════════════════════

// Note: borderRadius and padding are now responsive via CSS classes
export const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'rgba(12, 12, 10, 0.6)',
  backdropFilter: 'blur(16px) saturate(120%)',
  WebkitBackdropFilter: 'blur(16px) saturate(120%)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.3)',
}

export const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'rgba(12, 12, 10, 0.6)',
  backdropFilter: 'blur(16px) saturate(120%)',
  WebkitBackdropFilter: 'blur(16px) saturate(120%)',
  border: '1px solid rgba(201, 162, 39, 0.08)',
  boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.3)',
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
      background: 'rgba(0,0,0,0.4)',
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
        borderTopColor: 'var(--gold-400)',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
})

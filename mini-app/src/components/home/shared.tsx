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
        background: 'rgba(5, 5, 6, 0.16)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          borderRadius: 22,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(145deg, rgba(25,25,28,0.96), rgba(17,17,19,0.98))',
          border: '1px solid rgba(212,175,55,0.14)',
          boxShadow: '0 22px 48px -30px rgba(0,0,0,0.75)',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1.5px solid rgba(212,175,55,0.18)',
            borderTopColor: 'rgba(240,221,158,0.95)',
            animation: 'spin 0.85s linear infinite',
          }}
        />
      </div>
    </div>
  )
})

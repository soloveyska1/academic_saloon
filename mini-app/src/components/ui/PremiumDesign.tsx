import React from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM DESIGN TOKENS & COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const glassStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
    background: 'var(--bg-card)',
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)',
}

export const glassGoldStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
    background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: '1px solid var(--border-gold)',
    boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

export const CardInnerShine = () => (
    <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
        borderRadius: 'inherit',
    }} />
)

export const FloatingParticles = () => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: `${10 + (i * 12) % 80}%`,
        top: `${15 + (i * 15) % 70}%`,
        delay: `${i * 0.9}s`,
        size: 2 + (i % 2),
    }))

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            {particles.map(p => (
                <div
                    key={p.id}
                    className="gold-particle"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        animationDelay: p.delay,
                        animationDuration: `${8 + p.id % 3}s`,
                        position: 'absolute',
                        background: '#d4af37',
                        borderRadius: '50%',
                        opacity: 0.6,
                        animationName: 'float',
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite'
                    }}
                />
            ))}
            <style>{`
        @keyframes float {
          0% { transform: translateY(0px); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
      `}</style>
        </div>
    )
}

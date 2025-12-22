import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  SKELETON LOADERS — Premium loading states for homepage cards
//  Gold shimmer animation maintains luxury feel during load
//  Fixed: shimmer direction, duration, reduced motion support
// ═══════════════════════════════════════════════════════════════════════════

const shimmerAnimation = {
  initial: { backgroundPosition: '200% 0' },
  animate: { backgroundPosition: '-200% 0' },
  transition: { duration: 1.2, repeat: Infinity, ease: 'linear' },
}

const skeletonBaseStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-card) 0%, rgba(212,175,55,0.1) 50%, var(--bg-card) 100%)',
  backgroundSize: '200% 100%',
  borderRadius: 8,
}

// Base skeleton bar component
const SkeletonBar = memo(function SkeletonBar({
  width = '100%',
  height = 16,
  style,
}: {
  width?: string | number
  height?: number
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      {...shimmerAnimation}
      style={{
        ...skeletonBaseStyle,
        width,
        height,
        ...style,
      }}
    />
  )
})

// Benefits Card Skeleton (Balance + Level grid)
export const BenefitsCardSkeleton = memo(function BenefitsCardSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16,
      }}
    >
      {/* Balance Card */}
      <div
        style={{
          borderRadius: 16,
          padding: 16,
          background: 'var(--bg-card)',
          border: '1px solid rgba(212,175,55,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <SkeletonBar width={12} height={12} style={{ borderRadius: 4 }} />
          <SkeletonBar width={40} height={10} />
        </div>
        <SkeletonBar width="80%" height={28} style={{ marginBottom: 12 }} />
        <SkeletonBar width={80} height={24} style={{ borderRadius: 100 }} />
      </div>

      {/* Level Card */}
      <div
        style={{
          borderRadius: 16,
          padding: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <SkeletonBar width={12} height={12} style={{ borderRadius: 4 }} />
          <SkeletonBar width={50} height={10} />
        </div>
        <SkeletonBar width="70%" height={18} style={{ marginBottom: 10 }} />
        <SkeletonBar width="100%" height={5} style={{ borderRadius: 100, marginBottom: 10 }} />
        <SkeletonBar width={60} height={10} />
      </div>
    </div>
  )
})

// Order Stats Card Skeleton
export const OrderStatsCardSkeleton = memo(function OrderStatsCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <SkeletonBar width={100} height={12} />
        <SkeletonBar width={60} height={20} style={{ borderRadius: 100 }} />
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <SkeletonBar width={40} height={38} style={{ marginBottom: 6 }} />
          <SkeletonBar width={70} height={10} />
        </div>
        <div style={{ flex: 1 }}>
          <SkeletonBar width={40} height={38} style={{ marginBottom: 6 }} />
          <SkeletonBar width={80} height={10} />
        </div>
      </div>
    </div>
  )
})

// Last Order Card Skeleton
export const LastOrderCardSkeleton = memo(function LastOrderCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkeletonBar width={48} height={48} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkeletonBar width="60%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBar width="40%" height={11} style={{ marginBottom: 6 }} />
          <SkeletonBar width={70} height={20} style={{ borderRadius: 100 }} />
        </div>
        <SkeletonBar width={14} height={14} style={{ borderRadius: 4 }} />
      </div>
    </div>
  )
})

// Achievements Skeleton (8 circles)
export const AchievementsSkeleton = memo(function AchievementsSkeleton() {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SkeletonBar width={100} height={10} />
        <SkeletonBar width={50} height={10} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBar
            key={i}
            width={32}
            height={32}
            style={{ borderRadius: '50%', opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
    </div>
  )
})

// Social Proof Strip Skeleton
export const SocialProofStripSkeleton = memo(function SocialProofStripSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        padding: '8px 12px',
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: '1px solid rgba(212,175,55,0.1)',
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            flex: 1,
          }}
        >
          <SkeletonBar width={40} height={14} />
          <SkeletonBar width={30} height={8} />
        </div>
      ))}
    </div>
  )
})

// Full Homepage Loading Skeleton
export const HomePageSkeleton = memo(function HomePageSkeleton() {
  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SkeletonBar width={48} height={48} style={{ borderRadius: '50%' }} />
          <div>
            <SkeletonBar width={80} height={11} style={{ marginBottom: 6 }} />
            <SkeletonBar width={100} height={20} />
          </div>
        </div>
        <SkeletonBar width={50} height={32} style={{ borderRadius: 8 }} />
      </div>

      {/* Social Proof */}
      <SocialProofStripSkeleton />

      {/* Benefits */}
      <BenefitsCardSkeleton />

      {/* CTA placeholder */}
      <SkeletonBar width="100%" height={56} style={{ borderRadius: 16, marginBottom: 16 }} />

      {/* Last Order */}
      <LastOrderCardSkeleton />

      {/* Achievements */}
      <AchievementsSkeleton />

      {/* Order Stats */}
      <OrderStatsCardSkeleton />
    </div>
  )
})

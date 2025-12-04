import { motion } from 'framer-motion'

interface Props {
  width?: string | number
  height?: string | number
  borderRadius?: number
  className?: string
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8 }: Props) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.1), transparent)',
        }}
      />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 16,
      padding: 20,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Skeleton width={40} height={40} borderRadius={10} />
        <Skeleton width={80} height={12} />
      </div>
      <Skeleton width="60%" height={28} borderRadius={6} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="40%" height={10} borderRadius={4} />
      </div>
    </div>
  )
}

export function SkeletonHomePage() {
  return (
    <div style={{ padding: '24px 20px 120px', background: '#09090b', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton width={52} height={52} borderRadius={26} />
          <div>
            <Skeleton width={80} height={12} borderRadius={4} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={120} height={18} borderRadius={4} />
            </div>
          </div>
        </div>
        <Skeleton width={140} height={36} borderRadius={10} />
      </div>

      {/* Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Hero Button */}
      <Skeleton width="100%" height={80} borderRadius={14} />
      <div style={{ marginTop: 16 }}>
        <Skeleton width="100%" height={72} borderRadius={16} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton width="100%" height={120} borderRadius={16} />
      </div>
    </div>
  )
}

// Gold-themed Skeleton for premium elements
export function GoldSkeleton({ width = '100%', height = 20, borderRadius = 8 }: Props) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(212, 175, 55, 0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
        }}
      />
    </div>
  )
}

// Order Card Skeleton
export function SkeletonOrderCard() {
  return (
    <div
      style={{
        padding: 18,
        background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.9) 0%, rgba(15, 15, 18, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <Skeleton width={80} height={24} borderRadius={8} />
        <Skeleton width={100} height={24} borderRadius={8} />
      </div>
      <Skeleton width="85%" height={18} borderRadius={6} />
      <div style={{ marginTop: 10 }}>
        <Skeleton width="60%" height={14} borderRadius={4} />
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={100} height={14} borderRadius={4} />
        <GoldSkeleton width={80} height={20} borderRadius={6} />
      </div>
    </div>
  )
}

// Profile Header Skeleton
export function SkeletonProfileHeader() {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <GoldSkeleton
        width={100}
        height={100}
        borderRadius={28}
      />
      <div style={{ marginTop: 16 }}>
        <Skeleton width={160} height={24} borderRadius={8} />
      </div>
      <div style={{ marginTop: 10 }}>
        <GoldSkeleton width={120} height={20} borderRadius={10} />
      </div>
    </div>
  )
}

// Stats Grid Skeleton
export function SkeletonStatsGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.8) 0%, rgba(15, 15, 18, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Skeleton width={48} height={48} borderRadius={12} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <GoldSkeleton width={60} height={28} borderRadius={6} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Skeleton width={80} height={12} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  )
}

// List Skeleton
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Full Page Loading Skeleton
export function SkeletonPage() {
  return (
    <div
      style={{
        padding: '16px 16px 120px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <GoldSkeleton width={80} height={80} borderRadius={24} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Skeleton width={200} height={28} borderRadius={8} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton width={160} height={16} borderRadius={6} />
        </div>
      </div>

      {/* Content */}
      <SkeletonList count={4} />
    </div>
  )
}

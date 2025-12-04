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

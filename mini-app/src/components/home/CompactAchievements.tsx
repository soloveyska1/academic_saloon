import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Star } from 'lucide-react'

// Glass card style
const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--bg-card)',
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
}

// Inner shine effect component for cards - memoized
const CardInnerShine = memo(function CardInnerShine() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  )
})

interface Achievement {
  icon: typeof Star
  label: string
  unlocked: boolean
  glow?: boolean
  description?: string
}

interface CompactAchievementsProps {
  achievements: Achievement[]
  onViewAll: () => void
}

export const CompactAchievements = memo(function CompactAchievements({
  achievements,
  onViewAll,
}: CompactAchievementsProps) {
  // Memoized calculations
  const unlockedCount = useMemo(
    () => achievements.filter(a => a.unlocked).length,
    [achievements]
  )

  const lastUnlocked = useMemo(
    () => [...achievements].reverse().find(a => a.unlocked),
    [achievements]
  )

  const nextToUnlock = useMemo(
    () => achievements.find(a => !a.unlocked),
    [achievements]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onViewAll}
      role="button"
      tabIndex={0}
      aria-label={`Достижения: разблокировано ${unlockedCount} из ${achievements.length}. Нажмите для просмотра всех достижений`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onViewAll()
        }
      }}
      style={{
        ...glassStyle,
        marginBottom: 16,
        cursor: 'pointer',
        padding: '16px 18px',
      }}
    >
      <CardInnerShine />
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Achievement icons stack */}
          <div aria-hidden="true" style={{ position: 'relative', width: 52, height: 44 }}>
            {/* Last unlocked (main) */}
            <div
              style={{
                boxShadow: lastUnlocked?.glow ? '0 0 16px rgba(212,175,55,0.4)' : 'none',
                position: 'absolute',
                left: 0,
                top: 0,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: lastUnlocked
                  ? 'linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.15) 100%)'
                  : 'rgba(40,40,40,0.5)',
                border: lastUnlocked
                  ? '1.5px solid rgba(212,175,55,0.6)'
                  : '1px solid rgba(80,80,80,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {lastUnlocked ? (
                <lastUnlocked.icon
                  size={22}
                  color="#D4AF37"
                  strokeWidth={1.5}
                  fill="rgba(212,175,55,0.2)"
                  aria-hidden="true"
                />
              ) : (
                <Star size={22} color="rgba(100,100,100,0.5)" strokeWidth={1.5} />
              )}
            </div>
            {/* Next to unlock (preview) */}
            {nextToUnlock && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: 'rgba(40,40,40,0.8)',
                  border: '1px dashed rgba(212,175,55,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                  opacity: 0.7,
                }}
              >
                <nextToUnlock.icon
                  size={12}
                  color="rgba(212,175,55,0.5)"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <div>
            <div
              aria-hidden="true"
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                marginBottom: 4,
              }}
            >
              ДОСТИЖЕНИЯ
            </div>
            <div
              aria-hidden="true"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}
            >
              {lastUnlocked ? lastUnlocked.label : 'Начните путь'}
            </div>
            {nextToUnlock && (
              <div
                aria-hidden="true"
                style={{ fontSize: 10, color: 'rgba(212,175,55,0.6)', marginTop: 2 }}
              >
                Далее: {nextToUnlock.label}
              </div>
            )}
          </div>
        </div>
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress dots */}
          <div aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
            {achievements.map((a, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: a.unlocked ? 'var(--gold-metallic)' : 'rgba(80,80,80,0.4)',
                  boxShadow: a.unlocked ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
                  border:
                    !a.unlocked && i === unlockedCount
                      ? '1px solid rgba(212,175,55,0.4)'
                      : 'none',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {unlockedCount}/{achievements.length}
          </span>
          <ChevronRight size={18} color="var(--text-muted)" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  )
})

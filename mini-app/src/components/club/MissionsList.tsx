import { memo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Calendar, User, CheckCircle2, ChevronRight,
  Target, Clock, MessageCircle, Upload
} from 'lucide-react'
import { Mission, MissionStatus } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  MISSIONS LIST - Daily tasks to earn points
// ═══════════════════════════════════════════════════════════════════════════════

interface MissionsListProps {
  missions: Mission[]
  onMissionClick?: (mission: Mission) => void
}

const getIcon = (iconName: string, color: string) => {
  const size = 16
  switch (iconName) {
    case 'FileText':
      return <FileText size={size} color={color} />
    case 'Calendar':
      return <Calendar size={size} color={color} />
    case 'User':
      return <User size={size} color={color} />
    case 'Clock':
      return <Clock size={size} color={color} />
    case 'MessageCircle':
      return <MessageCircle size={size} color={color} />
    case 'Upload':
      return <Upload size={size} color={color} />
    default:
      return <Target size={size} color={color} />
  }
}

const getStatusStyles = (status: MissionStatus) => {
  switch (status) {
    case 'completed':
      return {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.2)',
        iconColor: '#22c55e',
        textColor: 'rgba(255, 255, 255, 0.5)',
      }
    case 'in_progress':
      return {
        bg: 'rgba(212, 175, 55, 0.1)',
        border: 'rgba(212, 175, 55, 0.25)',
        iconColor: '#D4AF37',
        textColor: '#fff',
      }
    default:
      return {
        bg: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.08)',
        iconColor: 'rgba(255, 255, 255, 0.5)',
        textColor: '#fff',
      }
  }
}

export const MissionsList = memo(function MissionsList({
  missions,
  onMissionClick,
}: MissionsListProps) {
  const navigate = useNavigate()

  const handleClick = (mission: Mission) => {
    if (mission.status === 'completed') return

    // Haptic feedback
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    } catch {}

    if (onMissionClick) {
      onMissionClick(mission)
    } else if (mission.deepLinkTarget) {
      navigate(mission.deepLinkTarget)
    }
  }

  const completedCount = missions.filter(m => m.status === 'completed').length
  const totalPoints = missions.reduce((sum, m) => sum + m.rewardPoints, 0)
  const earnedPoints = missions
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.rewardPoints, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={18} color="#8B5CF6" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Задания дня
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                {completedCount}/{missions.length} выполнено
              </div>
            </div>
          </div>

          {/* Progress badge */}
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8B5CF6' }}>
              +{earnedPoints}/{totalPoints}
            </span>
          </div>
        </div>
      </div>

      {/* Missions */}
      <div style={{ padding: '0 12px 12px' }}>
        {missions.map((mission, idx) => {
          const styles = getStatusStyles(mission.status)
          const isCompleted = mission.status === 'completed'

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleClick(mission)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                marginBottom: idx < missions.length - 1 ? 8 : 0,
                borderRadius: 12,
                background: styles.bg,
                border: `1px solid ${styles.border}`,
                cursor: isCompleted ? 'default' : 'pointer',
                opacity: isCompleted ? 0.6 : 1,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${styles.iconColor}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} color={styles.iconColor} />
                ) : (
                  getIcon(mission.icon, styles.iconColor)
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: styles.textColor,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    marginBottom: 2,
                  }}
                >
                  {mission.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.4)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mission.description}
                </div>
              </div>

              {/* Reward */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isCompleted ? 'rgba(255, 255, 255, 0.4)' : '#D4AF37',
                  }}
                >
                  +{mission.rewardPoints}
                </span>
                {!isCompleted && (
                  <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
})

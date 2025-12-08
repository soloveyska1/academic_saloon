import { motion } from 'framer-motion'
import {
  Download, FileText, ExternalLink, CheckCircle2,
  Clock, FolderOpen, Shield, Sparkles, Lock, Star
} from 'lucide-react'
import { Order } from '../../types'

interface PremiumFilesSectionProps {
  order: Order
  onDownload?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles({ color = '#8b5cf6', count = 5 }: { color?: string; count?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: [0, 0.5, 0],
            y: [-10, -50],
            x: [0, (i % 2 === 0 ? 10 : -10)],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: `${20 + (i * 15)}%`,
            bottom: '20%',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DECORATIVE CORNER
// ═══════════════════════════════════════════════════════════════════════════

function DecorativeCorner({ position, color = '#8b5cf6' }: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  color?: string
}) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 0, left: 0, borderTop: `2px solid ${color}40`, borderLeft: `2px solid ${color}40`, borderRadius: '12px 0 0 0' },
    'top-right': { top: 0, right: 0, borderTop: `2px solid ${color}40`, borderRight: `2px solid ${color}40`, borderRadius: '0 12px 0 0' },
    'bottom-left': { bottom: 0, left: 0, borderBottom: `2px solid ${color}40`, borderLeft: `2px solid ${color}40`, borderRadius: '0 0 0 12px' },
    'bottom-right': { bottom: 0, right: 0, borderBottom: `2px solid ${color}40`, borderRight: `2px solid ${color}40`, borderRadius: '0 0 12px 0' },
  }

  return (
    <div style={{
      position: 'absolute',
      width: 20,
      height: 20,
      ...positionStyles[position],
    }} />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PremiumFilesSection({ order, onDownload }: PremiumFilesSectionProps) {
  const hasFiles = !!order.files_url
  const isCompleted = order.status === 'completed'
  const isReview = order.status === 'review'

  const accentColor = isCompleted ? '#22c55e' : '#8b5cf6'

  // ═══ NO FILES STATE ═══
  if (!hasFiles) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          padding: 24,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(28,28,32,0.95), rgba(18,18,22,0.98))',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 rgba(107,114,128,0)',
                '0 0 20px rgba(107,114,128,0.2)',
                '0 0 0 rgba(107,114,128,0)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(107,114,128,0.15), rgba(107,114,128,0.08))',
              border: '1px solid rgba(107,114,128,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Lock size={24} color="#6b7280" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 6,
              fontFamily: 'var(--font-serif)',
            }}>
              Файлы заказа
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Clock size={14} />
              Материалы будут загружены после выполнения
            </div>
          </div>
        </div>

        {/* Quality guarantee hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            marginTop: 16,
            padding: '14px 16px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))',
            border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(59,130,246,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={18} color="#3b82f6" />
          </div>
          <div style={{
            fontSize: 13,
            color: '#60a5fa',
            lineHeight: 1.5,
          }}>
            Все файлы проходят проверку на вирусы и качество
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // ═══ FILES AVAILABLE STATE ═══
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        borderRadius: 24,
        background: `linear-gradient(145deg, ${accentColor}15 0%, rgba(20,20,23,0.98) 100%)`,
        border: `1.5px solid ${accentColor}35`,
        boxShadow: `0 12px 40px -10px ${accentColor}25`,
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
      }}
    >
      {/* Floating particles */}
      <FloatingParticles color={accentColor} count={6} />

      {/* Decorative corners */}
      <DecorativeCorner position="top-left" color={accentColor} />
      <DecorativeCorner position="top-right" color={accentColor} />
      <DecorativeCorner position="bottom-left" color={accentColor} />
      <DecorativeCorner position="bottom-right" color={accentColor} />

      {/* Shimmer effect */}
      <motion.div
        animate={{ x: ['-200%', '300%'] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${accentColor}10, transparent)`,
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${accentColor}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            animate={{
              boxShadow: [
                `0 0 0 ${accentColor}00`,
                `0 0 20px ${accentColor}40`,
                `0 0 0 ${accentColor}00`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`,
              border: `1.5px solid ${accentColor}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} color={accentColor} />
          </motion.div>
          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 4,
              fontFamily: 'var(--font-serif)',
            }}>
              {isCompleted ? 'Готовая работа' : 'Работа готова'}
            </div>
            <div style={{
              fontSize: 13,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
            }}>
              <CheckCircle2 size={14} />
              {isCompleted ? 'Заказ успешно выполнен' : 'Скачайте и проверьте'}
            </div>
          </div>
        </div>

        {/* Star badge for completed */}
        {isCompleted && (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #D4AF37, #B38728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(212,175,55,0.3)',
            }}
          >
            <Star size={20} color="#0a0a0c" fill="#0a0a0c" />
          </motion.div>
        )}
      </div>

      {/* File preview */}
      <div style={{ padding: '16px 24px', position: 'relative', zIndex: 1 }}>
        <motion.div
          whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (order.files_url) {
              window.open(order.files_url, '_blank')
              onDownload?.()
            }
          }}
          style={{
            padding: 16,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={22} color="#3b82f6" />
            </div>
            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: 4,
              }}>
                {order.work_type_label || 'Работа'}
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
              }}>
                Яндекс.Диск • Нажмите для скачивания
              </div>
            </div>
          </div>

          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ExternalLink size={20} color="rgba(255,255,255,0.6)" />
          </motion.div>
        </motion.div>
      </div>

      {/* Download button */}
      <div style={{ padding: '0 24px 24px', position: 'relative', zIndex: 1 }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          animate={{
            boxShadow: [
              `0 8px 24px -4px ${accentColor}30`,
              `0 12px 32px -4px ${accentColor}50`,
              `0 8px 24px -4px ${accentColor}30`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          onClick={() => {
            if (order.files_url) {
              window.open(order.files_url, '_blank')
              onDownload?.()
            }
          }}
          style={{
            width: '100%',
            padding: '18px 24px',
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accentColor} 0%, ${isCompleted ? '#16a34a' : '#7c3aed'} 100%)`,
            border: 'none',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Download size={20} />
          Скачать файлы
        </motion.button>
      </div>

      {/* Quality badges */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1,
      }}>
        {[
          { icon: Shield, label: 'Проверено', color: '#22c55e' },
          { icon: CheckCircle2, label: 'По ГОСТ', color: '#3b82f6' },
          { icon: Star, label: 'Качество', color: '#D4AF37' },
        ].map((badge, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: `${badge.color}15`,
              border: `1px solid ${badge.color}30`,
            }}
          >
            <badge.icon size={14} color={badge.color} />
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: badge.color,
            }}>
              {badge.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

import { motion } from 'framer-motion'
import {
  Download, FileText, ExternalLink, CheckCircle2,
  Clock, FolderOpen, Shield, Sparkles
} from 'lucide-react'
import { Order } from '../../types'

interface PremiumFilesSectionProps {
  order: Order
  onDownload?: () => void
}

export function PremiumFilesSection({ order, onDownload }: PremiumFilesSectionProps) {
  const hasFiles = !!order.files_url
  const isCompleted = order.status === 'completed'
  const isReview = order.status === 'review'

  // If no files - show waiting state
  if (!hasFiles) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 24,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(20, 20, 23, 0.9), rgba(25, 25, 30, 0.95))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
        }}
      >
        <div className="flex items-center gap-4">
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'rgba(107, 114, 128, 0.1)',
            border: '1px solid rgba(107, 114, 128, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FolderOpen size={26} color="#6b7280" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 4,
            }}>
              Файлы заказа
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Clock size={14} />
              Материалы будут загружены после выполнения
            </div>
          </div>
        </div>

        {/* Progress hint */}
        <div style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={16} color="#3b82f6" />
          </div>
          <div style={{
            fontSize: 12,
            color: '#3b82f6',
            lineHeight: 1.5,
          }}>
            Все файлы проходят проверку на вирусы и качество перед отправкой
          </div>
        </div>
      </motion.div>
    )
  }

  // Files available - show premium download card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 24,
        background: isCompleted
          ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.12) 0%, rgba(20, 20, 23, 0.95) 100%)'
          : 'linear-gradient(145deg, rgba(139, 92, 246, 0.12) 0%, rgba(20, 20, 23, 0.95) 100%)',
        border: isCompleted
          ? '1px solid rgba(34, 197, 94, 0.3)'
          : '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: isCompleted
          ? '0 10px 40px -10px rgba(34, 197, 94, 0.2)'
          : '0 10px 40px -10px rgba(139, 92, 246, 0.2)',
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div className="flex items-center gap-4">
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: isCompleted
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(139, 92, 246, 0.15)',
            border: isCompleted
              ? '1px solid rgba(34, 197, 94, 0.2)'
              : '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={24} color={isCompleted ? '#22c55e' : '#8b5cf6'} />
          </div>
          <div>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 4,
            }}>
              {isCompleted ? 'Готовая работа' : 'Работа готова к проверке'}
            </div>
            <div style={{
              fontSize: 13,
              color: isCompleted ? '#22c55e' : '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <CheckCircle2 size={14} />
              {isCompleted ? 'Заказ успешно выполнен' : 'Нажмите, чтобы скачать и проверить'}
            </div>
          </div>
        </div>
      </div>

      {/* File preview (mock) */}
      <div style={{ padding: '16px 24px' }}>
        <motion.div
          whileHover={{ scale: 1.01 }}
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
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3">
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: 2,
              }}>
                {order.work_type_label || 'Работа'}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-muted)',
              }}>
                Яндекс.Диск • Нажмите для скачивания
              </div>
            </div>
          </div>

          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ExternalLink size={18} color="var(--text-secondary)" />
          </div>
        </motion.div>
      </div>

      {/* Download button */}
      <div style={{ padding: '0 24px 24px' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (order.files_url) {
              window.open(order.files_url, '_blank')
              onDownload?.()
            }
          }}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            background: isCompleted
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: isCompleted
              ? '0 10px 30px -5px rgba(34, 197, 94, 0.4)'
              : '0 10px 30px -5px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Download size={20} />
          Скачать файлы
        </motion.button>
      </div>

      {/* Quality badges */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        gap: 12,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {[
          { icon: Shield, label: 'Проверено', color: '#22c55e' },
          { icon: CheckCircle2, label: 'Оформлено по ГОСТ', color: '#3b82f6' },
        ].map((badge, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 10,
              background: `${badge.color}15`,
              border: `1px solid ${badge.color}30`,
            }}
          >
            <badge.icon size={14} color={badge.color} />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: badge.color,
            }}>
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

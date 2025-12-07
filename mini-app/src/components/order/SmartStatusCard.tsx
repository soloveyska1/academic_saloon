import { motion } from 'framer-motion'
import {
  Clock, CreditCard, Loader2, FileCheck, CheckCircle2,
  XCircle, AlertCircle, PenTool, Eye, Sparkles, ArrowRight,
  RefreshCw, MessageCircle, Download
} from 'lucide-react'
import { Order, OrderStatus } from '../../types'

interface SmartStatusCardProps {
  order: Order
  onActionClick?: (action: string) => void
}

interface StatusInfo {
  icon: typeof Clock
  label: string
  description: string
  nextStep: string
  action?: { label: string; action: string; icon: typeof Clock }
  color: string
  bgColor: string
  borderColor: string
  glowColor: string
  showProgress?: boolean
  pulseIcon?: boolean
}

const STATUS_INFO: Record<OrderStatus, StatusInfo> = {
  draft: {
    icon: PenTool,
    label: 'Черновик',
    description: 'Заказ создан, но ещё не отправлен на оценку.',
    nextStep: 'Заполните все поля и отправьте заказ.',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    glowColor: 'rgba(107, 114, 128, 0.2)',
  },
  pending: {
    icon: Clock,
    label: 'На оценке',
    description: 'Менеджер изучает вашу заявку и рассчитывает стоимость.',
    nextStep: 'Ожидайте — обычно оценка занимает 15-30 минут.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: 'rgba(245, 158, 11, 0.2)',
    pulseIcon: true,
  },
  waiting_estimation: {
    icon: Clock,
    label: 'На оценке',
    description: 'Менеджер изучает вашу заявку и рассчитывает стоимость.',
    nextStep: 'Ожидайте — обычно оценка занимает 15-30 минут.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: 'rgba(245, 158, 11, 0.2)',
    pulseIcon: true,
  },
  waiting_payment: {
    icon: CreditCard,
    label: 'Ожидает оплаты',
    description: 'Заказ оценён! Оплатите, чтобы мы начали работу.',
    nextStep: 'Выберите способ оплаты и переведите средства.',
    action: { label: 'Оплатить', action: 'payment', icon: CreditCard },
    color: '#d4af37',
    bgColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    glowColor: 'rgba(212, 175, 55, 0.2)',
  },
  confirmed: {
    icon: CreditCard,
    label: 'Ожидает оплаты',
    description: 'Заказ подтверждён! Оплатите для начала работы.',
    nextStep: 'Прокрутите вниз к форме оплаты.',
    action: { label: 'К оплате', action: 'payment', icon: CreditCard },
    color: '#d4af37',
    bgColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    glowColor: 'rgba(212, 175, 55, 0.2)',
  },
  verification_pending: {
    icon: Loader2,
    label: 'Проверка оплаты',
    description: 'Мы проверяем ваш платёж. Это займёт несколько минут.',
    nextStep: 'Не закрывайте приложение — статус обновится автоматически.',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    glowColor: 'rgba(6, 182, 212, 0.2)',
    pulseIcon: true,
  },
  paid: {
    icon: Loader2,
    label: 'В работе',
    description: 'Автор уже работает над вашим заказом!',
    nextStep: 'Следите за прогрессом — вы получите уведомление о готовности.',
    action: { label: 'Написать', action: 'chat', icon: MessageCircle },
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    glowColor: 'rgba(59, 130, 246, 0.2)',
    showProgress: true,
    pulseIcon: true,
  },
  paid_full: {
    icon: Loader2,
    label: 'В работе',
    description: 'Автор уже работает над вашим заказом!',
    nextStep: 'Следите за прогрессом — вы получите уведомление о готовности.',
    action: { label: 'Написать', action: 'chat', icon: MessageCircle },
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    glowColor: 'rgba(59, 130, 246, 0.2)',
    showProgress: true,
    pulseIcon: true,
  },
  in_progress: {
    icon: Loader2,
    label: 'В работе',
    description: 'Автор активно работает над вашим заказом!',
    nextStep: 'Следите за прогрессом — вы получите уведомление о готовности.',
    action: { label: 'Написать', action: 'chat', icon: MessageCircle },
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    glowColor: 'rgba(59, 130, 246, 0.2)',
    showProgress: true,
    pulseIcon: true,
  },
  review: {
    icon: Eye,
    label: 'На проверке',
    description: 'Работа готова! Проверьте и подтвердите выполнение.',
    nextStep: 'Скачайте файлы и оцените качество работы.',
    action: { label: 'Проверить', action: 'files', icon: Download },
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    glowColor: 'rgba(139, 92, 246, 0.2)',
  },
  revision: {
    icon: RefreshCw,
    label: 'Правки',
    description: 'Автор вносит правки по вашим замечаниям.',
    nextStep: 'Ожидайте — обновлённая версия скоро будет готова.',
    action: { label: 'Написать', action: 'chat', icon: MessageCircle },
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    glowColor: 'rgba(249, 115, 22, 0.2)',
    showProgress: true,
    pulseIcon: true,
  },
  completed: {
    icon: CheckCircle2,
    label: 'Завершён',
    description: 'Заказ успешно выполнен! Спасибо за доверие.',
    nextStep: 'Оставьте отзыв — это поможет другим клиентам.',
    action: { label: 'Отзыв', action: 'review', icon: Sparkles },
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    glowColor: 'rgba(34, 197, 94, 0.2)',
  },
  cancelled: {
    icon: XCircle,
    label: 'Отменён',
    description: 'Заказ был отменён.',
    nextStep: 'Вы можете создать новый заказ в любое время.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    glowColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejected: {
    icon: XCircle,
    label: 'Отклонён',
    description: 'К сожалению, мы не можем выполнить этот заказ.',
    nextStep: 'Свяжитесь с поддержкой для уточнения деталей.',
    action: { label: 'Написать', action: 'chat', icon: MessageCircle },
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    glowColor: 'rgba(239, 68, 68, 0.2)',
  },
}

export function SmartStatusCard({ order, onActionClick }: SmartStatusCardProps) {
  const info = STATUS_INFO[order.status] || STATUS_INFO.pending
  const StatusIcon = info.icon
  const progress = (order as any).progress || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        padding: 24,
        borderRadius: 24,
        background: `linear-gradient(135deg, ${info.bgColor} 0%, rgba(20, 20, 23, 0.9) 100%)`,
        border: `1px solid ${info.borderColor}`,
        boxShadow: `0 10px 40px -10px ${info.glowColor}`,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '50%',
        height: '100%',
        background: `radial-gradient(ellipse at top right, ${info.glowColor} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: info.bgColor,
              border: `1px solid ${info.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              {info.pulseIcon ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <StatusIcon size={24} color={info.color} />
                </motion.div>
              ) : (
                <StatusIcon size={24} color={info.color} />
              )}

              {/* Live indicator dot */}
              {info.pulseIcon && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: info.color,
                    border: '2px solid var(--bg-main)',
                    boxShadow: `0 0 10px ${info.color}`,
                  }}
                />
              )}
            </div>

            {/* Status label */}
            <div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: info.color,
                marginBottom: 2,
              }}>
                {info.label}
              </div>
              {info.pulseIcon && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: info.color,
                    }}
                  />
                  В процессе
                </div>
              )}
            </div>
          </div>

          {/* Quick action button */}
          {info.action && onActionClick && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onActionClick(info.action!.action)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: info.bgColor,
                border: `1px solid ${info.borderColor}`,
                color: info.color,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <info.action.icon size={16} />
              {info.action.label}
            </motion.button>
          )}
        </div>

        {/* Progress bar (if applicable) */}
        {info.showProgress && progress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Прогресс выполнения
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: info.color }}>
                {progress}%
              </span>
            </div>
            <div style={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${info.color}, ${info.color}88)`,
                  borderRadius: 4,
                  boxShadow: `0 0 15px ${info.glowColor}`,
                  position: 'relative',
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  }}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Description */}
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 12,
        }}>
          {info.description}
        </p>

        {/* Next step hint */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 8,
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowRight size={12} color="#d4af37" />
          </div>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#d4af37',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}>
              Что дальше
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              {info.nextStep}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

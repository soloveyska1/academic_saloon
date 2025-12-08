import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera, Sparkles,
  Clock, CheckCircle, XCircle, CreditCard, Loader, ChevronRight,
} from 'lucide-react'
import { Order } from '../types'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER CARD — Premium Zero-Latency Touch Component
//  Direct DOM manipulation for instant 60fps feedback in Telegram WebView
// ═══════════════════════════════════════════════════════════════════════════

// Work type icons mapping
const WORK_TYPE_ICONS: Record<string, typeof FileText> = {
  masters: GraduationCap,
  diploma: GraduationCap,
  coursework: BookOpen,
  practice: Briefcase,
  essay: PenTool,
  presentation: Presentation,
  control: ClipboardCheck,
  independent: Scroll,
  report: FileText,
  photo_task: Camera,
  other: Sparkles,
}

// Status config
interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  waiting_estimation: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  confirmed: { label: 'К оплате', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)', icon: CreditCard },
  waiting_payment: { label: 'К оплате', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)', icon: CreditCard },
  verification_pending: { label: 'Проверка', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)', icon: Loader },
  paid: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  paid_full: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  in_progress: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  review: { label: 'На проверке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: CheckCircle },
  cancelled: { label: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle },
  rejected: { label: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle },
}

interface OrderCardProps {
  order: Order
  index: number
}

export const OrderCard = React.memo(({ order, index }: OrderCardProps) => {
  const navigate = useNavigate()

  // Premium gesture hook — direct DOM manipulation for zero-latency
  const { ref, handlers } = usePremiumGesture({
    onTap: () => navigate(`/order/${order.id}`),
    scale: 0.97,
    hapticType: 'light',
    tolerance: 15,
    pressDelay: 40,
  })

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText

  return (
    <div
      ref={ref}
      {...handlers}
      className="order-card-premium card-enter"
      style={{
        animationDelay: `${index * 0.06}s`,
      }}
    >
      {/* Header: Icon + Title + Status */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <WorkIcon size={22} color="var(--gold-400)" strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0,
              marginBottom: 4,
            }}>
              {order.work_type_label}
            </h3>
            <p style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              margin: 0,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {order.subject}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: statusConfig.bgColor,
          borderRadius: 20,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusConfig.color,
            boxShadow: `0 0 8px ${statusConfig.color}`,
          }} />
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: statusConfig.color,
          }}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Progress Bar (if applicable) */}
      {order.progress > 0 && order.progress < 100 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            height: 4,
            background: 'var(--bg-glass)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div
              style={{
                height: '100%',
                width: `${order.progress}%`,
                background: 'var(--gold-metallic)',
                borderRadius: 2,
                boxShadow: 'var(--glow-gold)',
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 6,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--gold-400)',
              fontFamily: "var(--font-mono)",
            }}>
              {order.progress}%
            </span>
          </div>
        </div>
      )}

      {/* Promo Badge (if applied) */}
      {order.promo_code && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '8px 12px',
          background: 'rgba(139,92,246,0.1)',
          borderRadius: 10,
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🎟️</span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#a78bfa',
            }}>
              {order.promo_code}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#22c55e',
              background: 'rgba(34,197,94,0.15)',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              −{order.promo_discount || 0}%
            </span>
          </div>
          <span style={{
            fontSize: 11,
            color: '#22c55e',
            fontWeight: 500,
          }}>
            💚 Экономия {Math.round(order.price - (order.final_price || order.price)).toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}

      {/* Footer: ID + Price */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 14,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: "var(--font-mono)",
        }}>
          #{order.id}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Show original price struck through if promo applied */}
          {order.promo_code && order.price !== order.final_price && (
            <span style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              textDecoration: 'line-through',
              fontFamily: "var(--font-mono)",
            }}>
              {order.price?.toLocaleString('ru-RU')}
            </span>
          )}
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: order.promo_code ? '#22c55e' : 'var(--gold-200)',
            fontFamily: "var(--font-mono)",
          }}>
            {(order.final_price || order.price).toLocaleString('ru-RU')} ₽
          </span>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      </div>
    </div>
  )
})

OrderCard.displayName = 'OrderCard'

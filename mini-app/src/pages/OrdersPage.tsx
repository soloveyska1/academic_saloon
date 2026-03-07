import { ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  LucideIcon,
  PenTool,
  Plus,
  Presentation,
  Scroll,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'

interface Props {
  orders: Order[]
}

type FilterType = 'all' | 'action' | 'active' | 'completed' | 'archived'

interface StatusMeta {
  label: string
  hint: string
  color: string
  chipBackground: string
  chipBorder: string
  icon: LucideIcon
  priority: number
  needsAction: boolean
  step: number
  actionLabel?: string
}

const WORK_TYPE_ICONS: Record<string, LucideIcon> = {
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

const STATUS_META: Record<string, StatusMeta> = {
  pending: {
    label: 'Оценка',
    hint: 'Собираем вводные и готовим расчет.',
    color: '#fbbf24',
    chipBackground: 'rgba(251, 191, 36, 0.12)',
    chipBorder: 'rgba(251, 191, 36, 0.22)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
  },
  waiting_estimation: {
    label: 'Оценка',
    hint: 'Собираем вводные и готовим расчет.',
    color: '#fbbf24',
    chipBackground: 'rgba(251, 191, 36, 0.12)',
    chipBorder: 'rgba(251, 191, 36, 0.22)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
  },
  confirmed: {
    label: 'Ожидает оплаты',
    hint: 'После оплаты сразу запускаем заказ в работу.',
    color: '#d4af37',
    chipBackground: 'rgba(212, 175, 55, 0.14)',
    chipBorder: 'rgba(212, 175, 55, 0.24)',
    icon: CreditCard,
    priority: 1,
    needsAction: true,
    step: 2,
    actionLabel: 'Оплатить',
  },
  waiting_payment: {
    label: 'Ожидает оплаты',
    hint: 'После оплаты сразу запускаем заказ в работу.',
    color: '#d4af37',
    chipBackground: 'rgba(212, 175, 55, 0.14)',
    chipBorder: 'rgba(212, 175, 55, 0.24)',
    icon: CreditCard,
    priority: 1,
    needsAction: true,
    step: 2,
    actionLabel: 'Оплатить',
  },
  verification_pending: {
    label: 'Проверяем оплату',
    hint: 'Платеж получен, сейчас подтверждаем зачисление.',
    color: '#60a5fa',
    chipBackground: 'rgba(96, 165, 250, 0.12)',
    chipBorder: 'rgba(96, 165, 250, 0.22)',
    icon: Activity,
    priority: 4,
    needsAction: false,
    step: 2,
  },
  paid: {
    label: 'В работе',
    hint: 'Команда уже работает над задачей.',
    color: '#60a5fa',
    chipBackground: 'rgba(96, 165, 250, 0.12)',
    chipBorder: 'rgba(96, 165, 250, 0.22)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  paid_full: {
    label: 'В работе',
    hint: 'Команда уже работает над задачей.',
    color: '#60a5fa',
    chipBackground: 'rgba(96, 165, 250, 0.12)',
    chipBorder: 'rgba(96, 165, 250, 0.22)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  in_progress: {
    label: 'В работе',
    hint: 'Команда уже работает над задачей.',
    color: '#60a5fa',
    chipBackground: 'rgba(96, 165, 250, 0.12)',
    chipBorder: 'rgba(96, 165, 250, 0.22)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  review: {
    label: 'Готов к проверке',
    hint: 'Нужно открыть заказ и посмотреть готовый результат.',
    color: '#4ade80',
    chipBackground: 'rgba(74, 222, 128, 0.12)',
    chipBorder: 'rgba(74, 222, 128, 0.22)',
    icon: CheckCircle2,
    priority: 2,
    needsAction: true,
    step: 4,
    actionLabel: 'Проверить',
  },
  revision: {
    label: 'На доработке',
    hint: 'Посмотрите комментарии и подтвердите следующий шаг.',
    color: '#fb923c',
    chipBackground: 'rgba(251, 146, 60, 0.12)',
    chipBorder: 'rgba(251, 146, 60, 0.22)',
    icon: AlertCircle,
    priority: 2,
    needsAction: true,
    step: 3,
    actionLabel: 'Открыть',
  },
  completed: {
    label: 'Завершен',
    hint: 'Заказ закрыт и доступен в истории.',
    color: '#4ade80',
    chipBackground: 'rgba(74, 222, 128, 0.10)',
    chipBorder: 'rgba(74, 222, 128, 0.18)',
    icon: CheckCircle2,
    priority: 10,
    needsAction: false,
    step: 4,
  },
  cancelled: {
    label: 'Закрыт',
    hint: 'Заказ остановлен и перенесен в историю.',
    color: '#71717a',
    chipBackground: 'rgba(113, 113, 122, 0.10)',
    chipBorder: 'rgba(113, 113, 122, 0.18)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
  rejected: {
    label: 'Закрыт',
    hint: 'Заказ остановлен и перенесен в историю.',
    color: '#71717a',
    chipBackground: 'rgba(113, 113, 122, 0.10)',
    chipBorder: 'rgba(113, 113, 122, 0.18)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
}

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getHoursUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))
}

function formatDeadline(deadline: string | null | undefined): string {
  const hours = getHoursUntilDeadline(deadline)
  const days = getDaysUntilDeadline(deadline)

  if (days === null) return 'Без срока'
  if (hours !== null && hours <= 0) return 'Срок прошел'
  if (hours !== null && hours <= 24) return `${hours} ч`
  if (days <= 7) return `${days} дн`

  const date = parseDateSafe(deadline)
  if (!date) return 'Без срока'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatMoney(amount: number | null | undefined): string {
  return `${Math.max(0, Math.round(amount || 0)).toLocaleString('ru-RU')} ₽`
}

function pluralize(value: number, forms: [string, string, string]): string {
  const absValue = Math.abs(value) % 100
  const remainder = absValue % 10

  if (absValue > 10 && absValue < 20) {
    return forms[2]
  }

  if (remainder > 1 && remainder < 5) {
    return forms[1]
  }

  if (remainder === 1) {
    return forms[0]
  }

  return forms[2]
}

function getRemainingAmount(order: Order): number {
  return Math.max((order.final_price || order.price || 0) - (order.paid_amount || 0), 0)
}

function isActiveStatus(status: string): boolean {
  return !['completed', 'cancelled', 'rejected'].includes(status)
}

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] || STATUS_META.pending
}

function getDisplayTitle(order: Order): string {
  return order.topic?.trim() || order.subject?.trim() || order.work_type_label || `Заказ #${order.id}`
}

function getDisplaySubtitle(order: Order): string {
  const parts = [
    order.topic?.trim() && order.subject?.trim() && order.topic.trim() !== order.subject.trim() ? order.subject.trim() : null,
    order.work_type_label || null,
  ].filter(Boolean)

  return parts.join(' • ') || `Заказ #${order.id}`
}

function getPrimaryActionPath(order: Order): string {
  if (['confirmed', 'waiting_payment'].includes(order.status)) {
    return `/order/${order.id}?action=pay`
  }

  return `/order/${order.id}`
}

function compareOrders(a: Order, b: Order): number {
  const metaA = getStatusMeta(a.status)
  const metaB = getStatusMeta(b.status)

  if (metaA.priority !== metaB.priority) {
    return metaA.priority - metaB.priority
  }

  const deadlineA = getHoursUntilDeadline(a.deadline)
  const deadlineB = getHoursUntilDeadline(b.deadline)
  if (deadlineA !== null && deadlineB !== null && deadlineA !== deadlineB) {
    return deadlineA - deadlineB
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function getSectionedOrders(orders: Order[], filter: FilterType, query: string) {
  if (query.trim() || filter !== 'all') {
    return [
      {
        key: filter,
        title: getFilterTitle(filter),
        caption: getFilterCaption(filter),
        orders,
      },
    ]
  }

  const actionOrders = orders.filter(order => getStatusMeta(order.status).needsAction)
  const activeOrders = orders.filter(order => !getStatusMeta(order.status).needsAction && isActiveStatus(order.status))
  const recentCompleted = orders.filter(order => order.status === 'completed').slice(0, 3)
  const closedOrders = orders.filter(order => ['cancelled', 'rejected'].includes(order.status)).slice(0, 3)

  const sections = [
    {
      key: 'action',
      title: 'Требуют вашего решения',
      caption: 'Здесь собраны заказы, где нужен ваш следующий шаг.',
      orders: actionOrders,
    },
    {
      key: 'active',
      title: 'В работе',
      caption: 'Все активные заказы с текущим этапом, сроком и суммой.',
      orders: activeOrders,
    },
    {
      key: 'completed',
      title: 'Недавно завершено',
      caption: 'Готовые работы, которые можно открыть и пересмотреть.',
      orders: recentCompleted,
    },
    {
      key: 'closed',
      title: 'История',
      caption: 'Закрытые и отменённые заявки для справки.',
      orders: closedOrders,
    },
  ].filter(section => section.orders.length > 0)

  if (sections.length > 0) {
    return sections
  }

  return [
    {
      key: 'all',
      title: 'Все заказы',
      caption: 'Полный список без дополнительной группировки.',
      orders,
    },
  ]
}

function getFilterTitle(filter: FilterType): string {
  switch (filter) {
    case 'action':
      return 'Требуют решения'
    case 'active':
      return 'Активные'
    case 'completed':
      return 'Завершенные'
    case 'archived':
      return 'Архив'
    case 'all':
    default:
      return 'Все заказы'
  }
}

function getFilterCaption(filter: FilterType): string {
  switch (filter) {
    case 'action':
      return 'Платежи, подтверждения и проверки, где нужен ваш ответ.'
    case 'active':
      return 'Все заказы, которые ещё находятся в работе.'
    case 'completed':
      return 'Готовые работы и завершённые задачи.'
    case 'archived':
      return 'Скрытые и архивные заказы.'
    case 'all':
    default:
      return 'Весь список заказов, сроков и следующих шагов.'
  }
}

function getSurfaceStyle(active = false) {
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 24,
    background: `
      radial-gradient(circle at top right, rgba(212, 175, 55, ${active ? '0.12' : '0.08'}), transparent 36%),
      linear-gradient(180deg, rgba(19, 18, 24, 0.97), rgba(10, 10, 16, 0.96))
    `,
    border: `1px solid ${active ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255, 255, 255, 0.06)'}`,
    boxShadow: active ? '0 22px 50px -36px rgba(212, 175, 55, 0.25)' : '0 20px 42px -36px rgba(0, 0, 0, 0.82)',
  }
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 18,
      background: 'rgba(255, 255, 255, 0.035)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 17,
        fontWeight: 700,
        color: accent,
      }}>
        {value}
      </div>
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flexShrink: 0,
        height: 40,
        padding: '0 14px',
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(212, 175, 55, 0.28)' : 'rgba(255, 255, 255, 0.08)'}`,
        background: active ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.03)',
        color: active ? 'var(--gold-300)' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span style={{
          fontSize: 11,
          color: active ? 'var(--gold-300)' : 'rgba(255,255,255,0.44)',
        }}>
          {count}
        </span>
      )}
    </motion.button>
  )
}

function StepTrack({ step, color }: { step: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
      {Array.from({ length: 4 }, (_, index) => {
        const active = index < step
        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: active ? color : 'rgba(255, 255, 255, 0.08)',
              boxShadow: active ? `0 0 12px ${color}33` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

function EmptyState({
  onCreateOrder,
  hasSearch,
  onReset,
}: {
  onCreateOrder: () => void
  hasSearch: boolean
  onReset: () => void
}) {
  return (
    <div style={{
      ...getSurfaceStyle(),
      padding: '24px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: 20,
        margin: '0 auto 16px',
        background: 'rgba(212, 175, 55, 0.10)',
        border: '1px solid rgba(212, 175, 55, 0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <FolderOpen size={26} color="var(--gold-300)" />
      </div>

      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 8,
      }}>
        {hasSearch ? 'Ничего не нашли' : 'Пока нет заказов'}
      </div>
      <div style={{
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--text-secondary)',
        marginBottom: 18,
      }}>
        {hasSearch
          ? 'Попробуйте изменить запрос или открыть другой фильтр.'
          : 'Когда создадите первый заказ, здесь появится его статус, сроки и все следующие шаги.'}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onCreateOrder}
          style={{
            minHeight: 46,
            padding: '0 18px',
            borderRadius: 14,
            border: 'none',
            background: 'var(--gold-metallic)',
            color: '#090909',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Создать заказ
        </motion.button>

        {hasSearch && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            style={{
              minHeight: 46,
              padding: '0 18px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Сбросить
          </motion.button>
        )}
      </div>
    </div>
  )
}

function OrdersSection({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-muted)',
        }}>
          {caption}
        </div>
      </div>
      {children}
    </section>
  )
}

function ActionSpotlight({
  order,
  payableCount,
  payableTotal,
  onOpenOrder,
  onBatchPay,
}: {
  order: Order | null
  payableCount: number
  payableTotal: number
  onOpenOrder: (order: Order, path?: string) => void
  onBatchPay: () => void
}) {
  if (payableCount > 1) {
    return (
      <motion.button
        type="button"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.985 }}
        onClick={onBatchPay}
        style={{
          ...getSurfaceStyle(true),
          width: '100%',
          padding: '18px 18px 16px',
          marginBottom: 18,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'rgba(212, 175, 55, 0.14)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CreditCard size={22} color="var(--gold-300)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(212,175,55,0.75)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Приоритетное действие
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 4,
            }}>
              Оплатить {payableCount} {pluralize(payableCount, ['заказ', 'заказа', 'заказов'])} одним платежом
            </div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}>
              Один переход вместо нескольких оплат. Общая сумма: {formatMoney(payableTotal)}.
            </div>
          </div>

          <div style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'var(--gold-metallic)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowUpRight size={18} color="#090909" />
          </div>
        </div>
      </motion.button>
    )
  }

  if (!order) {
    return null
  }

  const meta = getStatusMeta(order.status)
  const Icon = meta.icon

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenOrder(order, getPrimaryActionPath(order))}
      style={{
        ...getSurfaceStyle(true),
        width: '100%',
        padding: '18px 18px 16px',
        marginBottom: 18,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: meta.chipBackground,
          border: `1px solid ${meta.chipBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={22} color={meta.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: meta.color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}>
            Главное действие
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {getDisplayTitle(order)}
          </div>
          <div style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}>
            {meta.actionLabel ? `${meta.actionLabel} и перейдите к следующему этапу.` : meta.hint}
          </div>
        </div>

        <div style={{
          padding: '0 14px',
          height: 40,
          borderRadius: 14,
          background: 'var(--gold-metallic)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#090909',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {meta.actionLabel || 'Открыть'}
        </div>
      </div>
    </motion.button>
  )
}

function OrderCard({
  order,
  index,
  onOpenOrder,
}: {
  order: Order
  index: number
  onOpenOrder: (order: Order, path?: string) => void
}) {
  const meta = getStatusMeta(order.status)
  const Icon = meta.icon
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const amount = ['confirmed', 'waiting_payment'].includes(order.status)
    ? getRemainingAmount(order)
    : (order.final_price || order.price || 0)
  const amountLabel = ['confirmed', 'waiting_payment'].includes(order.status) ? 'К оплате' : 'Стоимость'
  const progressValue = typeof order.progress === 'number' && order.progress > 0 ? `${Math.round(order.progress)}%` : null
  const stepLabel = meta.step > 0 ? `Этап ${Math.min(meta.step, 4)} из 4` : 'История'

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.32 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onOpenOrder(order)}
      style={{
        ...getSurfaceStyle(meta.needsAction),
        width: '100%',
        padding: '14px',
        marginBottom: 10,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: meta.chipBackground,
          border: `1px solid ${meta.chipBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WorkIcon size={20} color={meta.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'space-between',
            marginBottom: 8,
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {order.work_type_label || 'Заказ'}
              </span>
              <span style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.22)',
              }} />
              <span style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
              }}>
                #{order.id}
              </span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 999,
              background: meta.chipBackground,
              border: `1px solid ${meta.chipBorder}`,
              color: meta.color,
              fontSize: 11,
              fontWeight: 700,
            }}>
              <Icon size={13} />
              {meta.label}
            </div>
          </div>

          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.35,
            marginBottom: 4,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}>
            {getDisplayTitle(order)}
          </div>

          <div style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            marginBottom: 10,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1,
            overflow: 'hidden',
          }}>
            {getDisplaySubtitle(order)}
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
          }}>
            <MetaChip icon={Clock3} label={formatDeadline(order.deadline)} />
            <MetaChip icon={meta.needsAction ? CreditCard : FolderOpen} label={`${amountLabel}: ${formatMoney(amount)}`} />
            <MetaChip icon={Activity} label={stepLabel} />
            {order.files_url && <MetaChip icon={FileText} label="Есть файлы" />}
            {progressValue && <MetaChip icon={Activity} label={`Готовность ${progressValue}`} />}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <StepTrack step={meta.step} color={meta.color} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.42)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 2,
                }}>
                  Следующий шаг
                </div>
                <div style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}>
                  {meta.hint}
                </div>
              </div>
            </div>

            {meta.needsAction ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenOrder(order, getPrimaryActionPath(order))
                }}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--gold-metallic)',
                  color: '#090909',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {meta.actionLabel || 'Открыть'}
              </motion.button>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                Открыть
                <ChevronRight size={16} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 10px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.05)',
      color: 'var(--text-muted)',
      fontSize: 11.5,
      fontWeight: 600,
      lineHeight: 1,
    }}>
      <Icon size={12} />
      {label}
    </span>
  )
}

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const capability = useCapability()
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const nonArchivedOrders = useMemo(
    () => orders.filter(order => !order.is_archived).sort(compareOrders),
    [orders]
  )

  const stats = useMemo(() => {
    const archived = orders.filter(order => order.is_archived)
    const action = nonArchivedOrders.filter(order => getStatusMeta(order.status).needsAction)
    const active = nonArchivedOrders.filter(order => isActiveStatus(order.status))
    const completed = nonArchivedOrders.filter(order => order.status === 'completed')
    const totalValue = nonArchivedOrders.reduce((sum, order) => {
      if (['cancelled', 'rejected'].includes(order.status)) {
        return sum
      }
      return sum + (order.final_price || order.price || 0)
    }, 0)

    return {
      all: nonArchivedOrders.length,
      action: action.length,
      active: active.length,
      completed: completed.length,
      archived: archived.length,
      totalValue,
    }
  }, [orders, nonArchivedOrders])

  const payableOrders = useMemo(
    () => nonArchivedOrders.filter(order => ['confirmed', 'waiting_payment'].includes(order.status) && getRemainingAmount(order) > 0),
    [nonArchivedOrders]
  )

  const batchPaymentTotal = useMemo(
    () => payableOrders.reduce((sum, order) => sum + getRemainingAmount(order), 0),
    [payableOrders]
  )

  const spotlightOrder = useMemo(
    () => nonArchivedOrders.find(order => getStatusMeta(order.status).needsAction) || null,
    [nonArchivedOrders]
  )

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return nonArchivedOrders
      .filter((order) => {
        if (filter === 'action') return getStatusMeta(order.status).needsAction
        if (filter === 'active') return isActiveStatus(order.status)
        if (filter === 'completed') return order.status === 'completed'
        if (filter === 'archived') return false
        return true
      })
      .filter((order) => {
        if (!normalizedQuery) return true
        return [
          order.subject,
          order.topic,
          order.work_type_label,
          String(order.id),
        ].some(value => value?.toLowerCase().includes(normalizedQuery))
      })
  }, [filter, nonArchivedOrders, searchQuery])

  const archivedOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return orders
      .filter(order => order.is_archived)
      .sort(compareOrders)
      .filter((order) => {
        if (!normalizedQuery) return true
        return [
          order.subject,
          order.topic,
          order.work_type_label,
          String(order.id),
        ].some(value => value?.toLowerCase().includes(normalizedQuery))
      })
  }, [orders, searchQuery])

  const visibleOrders = filter === 'archived' ? archivedOrders : filteredOrders
  const sections = getSectionedOrders(visibleOrders, filter, searchQuery)

  const heroTitle = stats.action > 0
    ? `${stats.action} ${pluralize(stats.action, ['заказ ждёт', 'заказа ждут', 'заказов ждут'])} вашего шага`
    : stats.active > 0
      ? `${stats.active} ${pluralize(stats.active, ['заказ в работе', 'заказа в работе', 'заказов в работе'])}`
      : stats.all > 0
        ? `${stats.all} ${pluralize(stats.all, ['заказ под контролем', 'заказа под контролем', 'заказов под контролем'])}`
        : 'Здесь появятся ваши заказы'

  const heroSubtitle = stats.action > 0
    ? 'Сначала показываем главное действие, затем полный список по этапам, срокам и суммам.'
    : 'Открывайте нужный заказ, смотрите его этап и переходите к следующему действию без лишних поисков.'

  const handleCreateOrder = () => {
    haptic('medium')
    navigate('/create-order')
  }

  const handleOpenOrder = (order: Order, path?: string) => {
    haptic('light')
    navigate(path || `/order/${order.id}`)
  }

  const handleBatchPay = () => {
    if (payableOrders.length < 2) return
    haptic('medium')
    navigate(`/batch-payment?orders=${payableOrders.map(order => order.id).join(',')}`)
  }

  const handleReset = () => {
    haptic('light')
    setSearchQuery('')
    setFilter('all')
  }

  const filterItems = [
    { key: 'all' as FilterType, label: 'Все', count: stats.all },
    { key: 'action' as FilterType, label: 'Нужно сейчас', count: stats.action },
    { key: 'active' as FilterType, label: 'В работе', count: stats.active },
    { key: 'completed' as FilterType, label: 'Готово', count: stats.completed },
    ...(stats.archived > 0 ? [{ key: 'archived' as FilterType, label: 'Архив', count: stats.archived }] : []),
  ]

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background">
        <PremiumBackground
          variant="gold"
          intensity="subtle"
          interactive={capability.tier >= 3}
        />
      </div>

      <div className="page-content">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(212,175,55,0.72)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Мои заказы
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.05,
              fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Ваши заказы
            </h1>
            <div style={{
              marginTop: 8,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              maxWidth: 340,
            }}>
              Статусы, сроки и все следующие шаги по каждому заказу в одном месте.
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateOrder}
            style={{
              minHeight: 46,
              padding: '0 16px',
              borderRadius: 16,
              border: 'none',
              background: 'var(--gold-metallic)',
              color: '#090909',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Plus size={18} />
            Новый заказ
          </motion.button>
        </motion.div>

        <motion.section
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...getSurfaceStyle(true),
            padding: '20px',
            marginBottom: 18,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 18,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-main)',
                lineHeight: 1.15,
                marginBottom: 8,
              }}>
                {heroTitle}
              </div>
              <div style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}>
                {heroSubtitle}
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.05)',
              minWidth: 96,
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.42)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}>
                Стоимость
              </div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--gold-300)',
                lineHeight: 1.25,
              }}>
                {formatMoney(stats.totalValue)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}>
            <StatPill label="Нужно сейчас" value={String(stats.action)} accent="var(--gold-300)" />
            <StatPill label="В работе" value={String(stats.active)} accent="#93c5fd" />
            <StatPill label="Завершено" value={String(stats.completed)} accent="#86efac" />
          </div>
        </motion.section>

        <ActionSpotlight
          order={spotlightOrder}
          payableCount={payableOrders.length}
          payableTotal={batchPaymentTotal}
          onOpenOrder={handleOpenOrder}
          onBatchPay={handleBatchPay}
        />

        <div style={{ marginBottom: 18 }}>
          <div style={{
            ...getSurfaceStyle(),
            padding: '12px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Search size={18} color="rgba(212,175,55,0.62)" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="По номеру, предмету или теме"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: 14,
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}>
            {filterItems.map((item) => (
              <FilterPill
                key={item.key}
                label={item.label}
                count={item.count}
                active={filter === item.key}
                onClick={() => {
                  haptic('light')
                  setFilter(item.key)
                }}
              />
            ))}
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <EmptyState
            onCreateOrder={handleCreateOrder}
            hasSearch={Boolean(searchQuery.trim()) || filter !== 'all'}
            onReset={handleReset}
          />
        ) : (
          sections.map((section) => (
            <OrdersSection key={section.key} title={section.title} caption={section.caption}>
              {section.orders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onOpenOrder={handleOpenOrder}
                />
              ))}
            </OrdersSection>
          ))
        )}
      </div>
    </div>
  )
}

export default OrdersPage

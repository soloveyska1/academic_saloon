/**
 * God Mode v3 — Reusable UI Widgets
 * KPICard · AlertStrip · Skeleton · StatusPipeline · BottomSheet · EmptyState
 */
import { memo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ChevronRight } from 'lucide-react'
import { STATUS_CONFIG, formatMoney } from './godConstants'
import { SparkLine } from './GodCharts'
import s from '../../pages/GodModePage.module.css'

/* ═══════ KPI Card ═══════ */

interface KPICardProps {
  label: string
  value: string | number
  trend?: { value: number; positive: boolean }
  sparkData?: number[]
  accent?: string
}

export const KPICard = memo(function KPICard({ label, value, trend, sparkData, accent = '#d4af37' }: KPICardProps) {
  return (
    <div className={s.kpiCard} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={`${s.flexRow} ${s.gap4}`} style={{ marginBottom: 4 }}>
        {trend && (
          <span className={trend.positive ? s.kpiTrendUp : s.kpiTrendDown}>
            {trend.positive ? '↑' : '↓'} {trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <div className={s.kpiValue}>{value}</div>
      <div className={s.kpiLabel}>{label}</div>
      {sparkData && sparkData.length > 1 && (
        <div className={s.kpiSpark}>
          <SparkLine values={sparkData} color={accent} />
        </div>
      )}
    </div>
  )
})

/* ═══════ Alert Strip ═══════ */

interface AlertItem {
  id: number
  label: string
  sublabel: string
  amount?: number
}

interface AlertStripProps {
  items: AlertItem[]
  onConfirm: (id: number) => void
  onReject: (id: number) => void
}

export const AlertStrip = memo(function AlertStrip({ items, onConfirm, onReject }: AlertStripProps) {
  if (items.length === 0) return null
  return (
    <div className={s.alertStrip}>
      {items.map((item) => (
        <div key={item.id} className={s.alertCard}>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <div className={s.flex1}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ec4899' }}>#{item.id}</div>
              <div className={s.mutedSmall}>{item.label}</div>
              {item.amount != null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {formatMoney(item.amount)}
                </div>
              )}
            </div>
          </div>
          <div className={s.alertCardActions}>
            <button type="button" className={s.successBtn} style={{ flex: 1, padding: '6px 8px', fontSize: 11 }} onClick={() => onConfirm(item.id)}>
              <Check size={12} /> Да
            </button>
            <button type="button" className={s.dangerBtn} style={{ flex: 1, padding: '6px 8px', fontSize: 11 }} onClick={() => onReject(item.id)}>
              <X size={12} /> Нет
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})

/* ═══════ Status Pipeline ═══════ */

interface StatusPipelineProps {
  statuses: Record<string, number>
  active?: string
  onTap: (status: string) => void
}

export const StatusPipeline = memo(function StatusPipeline({ statuses, active, onTap }: StatusPipelineProps) {
  const all = Object.entries(statuses).filter(([, count]) => count > 0)
  return (
    <div className={s.statusPipeline}>
      <button
        type="button"
        className={!active ? s.statusPillActive : s.statusPill}
        onClick={() => onTap('')}
      >
        <span className={s.statusPillCount}>
          {Object.values(statuses).reduce((a, b) => a + b, 0)}
        </span>
        <span className={s.statusPillLabel}>Все</span>
      </button>
      {all.map(([status, count]) => {
        const cfg = STATUS_CONFIG[status]
        if (!cfg) return null
        return (
          <button
            key={status}
            type="button"
            className={active === status ? s.statusPillActive : s.statusPill}
            onClick={() => onTap(status)}
          >
            <span className={s.statusPillCount}>{count}</span>
            <span className={s.statusPillLabel}>{cfg.label}</span>
          </button>
        )
      })}
    </div>
  )
})

/* ═══════ Skeleton ═══════ */

interface SkeletonProps {
  variant?: 'card' | 'line' | 'chart' | 'stat'
  count?: number
}

export const Skeleton = memo(function Skeleton({ variant = 'card', count = 3 }: SkeletonProps) {
  const cls = {
    card: s.skeletonCard,
    line: s.skeletonLine,
    chart: s.skeletonChart,
    stat: s.skeletonStat,
  }[variant]

  if (variant === 'stat') {
    return (
      <div className={s.kpiGrid}>
        {Array.from({ length: count }, (_, i) => <div key={i} className={cls} />)}
      </div>
    )
  }

  return (
    <div className={`${s.flexCol} ${s.gap8}`}>
      {Array.from({ length: count }, (_, i) => <div key={i} className={cls} />)}
    </div>
  )
})

/* ═══════ Empty State ═══════ */

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: { label: string; onClick: () => void }
}

export const EmptyState = memo(function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className={s.emptyState}>
      {icon && <div className={s.emptyIcon}>{icon}</div>}
      <div className={s.emptyTitle}>{title}</div>
      {description && <div className={s.emptyDesc}>{description}</div>}
      {action && (
        <button type="button" className={s.secondaryBtn} onClick={action.onClick} style={{ marginTop: 8 }}>
          {action.label}
        </button>
      )}
    </div>
  )
})

/* ═══════ Bottom Sheet ═══════ */

interface SheetTab {
  id: string
  label: string
}

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  tabs?: SheetTab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  children: ReactNode
}

export const BottomSheet = memo(function BottomSheet({
  isOpen, onClose, title, tabs, activeTab, onTabChange, children,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={s.sheetOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={s.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className={s.sheetHandle} />
            {title && (
              <div className={s.sheetHeader}>
                <div className={s.sheetTitle}>{title}</div>
                <button type="button" className={s.ghostBtn} onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            )}
            {tabs && tabs.length > 0 && (
              <div className={s.sheetTabs}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={activeTab === tab.id ? s.sheetTabActive : s.sheetTab}
                    onClick={() => onTabChange?.(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <div className={s.sheetBody}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

/* ═══════ State Card (error / info) ═══════ */

interface StateCardProps {
  tone?: 'error' | 'info' | 'empty'
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const StateCard = memo(function StateCard({ tone, title, description, actionLabel, onAction }: StateCardProps) {
  const isError = tone === 'error'
  return (
    <div
      className={s.card}
      style={isError ? { borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' } : undefined}
    >
      <div className={`${s.flexRow} ${s.gap6}`}>
        <span style={{ fontSize: 14 }}>{isError ? '⚠️' : 'ℹ️'}</span>
        <div className={s.flex1}>
          <div style={{ fontSize: 13, fontWeight: 600, color: isError ? '#ef4444' : '#e4e4e7' }}>{title}</div>
          {description && <div className={s.mutedSmall} style={{ marginTop: 2 }}>{description}</div>}
        </div>
      </div>
      {actionLabel && onAction && (
        <button type="button" className={s.secondaryBtn} onClick={onAction} style={{ marginTop: 8 }}>
          <ChevronRight size={12} /> {actionLabel}
        </button>
      )}
    </div>
  )
})

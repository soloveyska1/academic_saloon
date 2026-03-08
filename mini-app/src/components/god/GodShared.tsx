import { memo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import s from '../../pages/GodModePage.module.css'

/* ═══════ StateCard ═══════ */

interface StateCardProps {
  title: string
  description: string
  tone?: 'neutral' | 'error'
  actionLabel?: string
  onAction?: () => void
}

export const StateCard = memo(function StateCard({
  title, description, tone = 'neutral', actionLabel, onAction,
}: StateCardProps) {
  return (
    <div className={tone === 'error' ? s.cardError : s.card}>
      <div className={`${s.flexRow} ${s.gap8}`} style={{ marginBottom: 6 }}>
        <AlertTriangle size={16} color={tone === 'error' ? '#f87171' : '#d4af37'} />
        <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 13 }}>{title}</span>
      </div>
      <div className={s.muted} style={{ marginBottom: actionLabel ? 10 : 0 }}>{description}</div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={s.secondaryBtn}>
          <RefreshCw size={14} /> {actionLabel}
        </button>
      )}
    </div>
  )
})

/* ═══════ StatCard ═══════ */

interface StatCardProps {
  label: string
  value: string | number
  color?: string
}

export const StatCard = memo(function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={s.stat} style={{ '--accent': color || '#3f3f46' } as React.CSSProperties}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
    </div>
  )
})

/* ═══════ LoadingSpinner ═══════ */

export const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className={s.spinnerWrap}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      >
        <RefreshCw size={20} color="#d4af37" />
      </motion.div>
    </div>
  )
})

import { memo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react'
import s from '../../pages/GodModePage.module.css'

/* ═══════ SectionHeader ═══════ */

interface SectionHeaderProps {
  eyebrow: string
  title: string
  description: string
  meta?: string
}

export const SectionHeader = memo(function SectionHeader({
  eyebrow,
  title,
  description,
  meta,
}: SectionHeaderProps) {
  return (
    <div className={`${s.card} ${s.flexColumn} ${s.gap10}`} style={{ padding: 16 }}>
      <div className={`${s.flexRow} ${s.flexWrap}`} style={{ justifyContent: 'space-between', gap: 12 }}>
        <span className={s.badgeGoldEyebrow}>{eyebrow}</span>
        {meta && <span className={s.muted}>{meta}</span>}
      </div>
      <div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
    </div>
  )
})

/* ═══════ StateCard ═══════ */

interface StateCardProps {
  title: string
  description: string
  tone?: 'neutral' | 'error'
  actionLabel?: string
  onAction?: () => void
}

export const StateCard = memo(function StateCard({
  title,
  description,
  tone = 'neutral',
  actionLabel,
  onAction,
}: StateCardProps) {
  const accent = tone === 'error' ? '#fca5a5' : '#d4af37'

  return (
    <div
      className={tone === 'error' ? s.cardError : s.card}
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div className={s.flexRow} style={{ gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: tone === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(212,175,55,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={18} color={accent} />
        </div>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{title}</div>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.6 }}>
        {description}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={s.secondaryBtn} style={{ width: 'fit-content' }}>
          <RefreshCw size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  )
})

/* ═══════ StatCard ═══════ */

interface StatCardProps {
  label: string
  value: string | number
  color: string
}

export const StatCard = memo(function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={s.statCardBorder} style={{ '--accent': color } as React.CSSProperties}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
    </div>
  )
})

/* ═══════ FocusCard ═══════ */

interface FocusCardProps {
  label: string
  count: number
  description: string
  accent: string
  onClick: () => void
}

export const FocusCard = memo(function FocusCard({
  label,
  count,
  description,
  accent,
  onClick,
}: FocusCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={s.focusCard}
      style={{
        border: `1px solid ${accent}25`,
        background: `linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98)), ${accent}`,
      }}
    >
      <div className={s.flexRow} style={{ alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div className={s.focusCount} style={{ background: `${accent}18`, color: accent }}>
          {count}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={s.focusLabel}>{label}</div>
          <div className={s.focusDescription}>{description}</div>
        </div>
      </div>
      <div className={s.focusLink} style={{ color: accent }}>
        Открыть очередь
        <ChevronRight size={14} />
      </div>
    </motion.button>
  )
})

/* ═══════ LoadingSpinner ═══════ */

export const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className={s.spinnerWrap}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <RefreshCw size={24} color="#d4af37" />
      </motion.div>
    </div>
  )
})

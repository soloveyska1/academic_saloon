/**
 * God Mode v3 — Custom Chart Components
 * RevenueChart · SparkLine · FunnelBars
 * All SVG + framer-motion, zero external libraries
 */
import { memo, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatMoneyShort, formatDateShort, STATUS_CONFIG } from './godConstants'
import s from '../../pages/GodModePage.module.css'

/* ═══════ Revenue Chart (Animated Bar Chart) ═══════ */

interface RevenueItem {
  date: string
  revenue: number
  orders_count: number
}

interface RevenueChartProps {
  data: RevenueItem[]
  height?: number
}

export const RevenueChart = memo(function RevenueChart({ data, height = 180 }: RevenueChartProps) {
  const [tapped, setTapped] = useState<number | null>(null)

  const { bars, maxVal, yLabels } = useMemo(() => {
    if (!data.length) return { bars: [], maxVal: 0, yLabels: [] as string[] }
    const max = Math.max(...data.map((d) => d.revenue), 1)
    // Round up to nice number
    const nice = Math.ceil(max / 1000) * 1000
    const labels = [0, nice / 2, nice].map((v) => formatMoneyShort(v))
    return { bars: data, maxVal: nice || 1, yLabels: labels }
  }, [data])

  if (!bars.length) return null

  const padLeft = 48
  const padBottom = 24
  const padTop = 8
  const barAreaH = height - padBottom - padTop
  const barW = Math.max(4, Math.min(20, (300 - padLeft) / bars.length - 2))
  const svgW = padLeft + bars.length * (barW + 2) + 8

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={Math.max(svgW, 300)}
        height={height}
        viewBox={`0 0 ${Math.max(svgW, 300)} ${height}`}
        style={{ display: 'block' }}
      >
        {/* Y-axis grid lines */}
        {yLabels.map((label, i) => {
          const y = padTop + barAreaH - (barAreaH * i) / (yLabels.length - 1)
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={Math.max(svgW, 300)} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={padLeft - 6} y={y + 3} fill="#52525b" fontSize={9} textAnchor="end" fontFamily="monospace">
                {label}
              </text>
            </g>
          )
        })}

        {/* Gold gradient */}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d485" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>

        {/* Bars */}
        {bars.map((item, i) => {
          const barH = (item.revenue / maxVal) * barAreaH
          const x = padLeft + i * (barW + 2)
          const y = padTop + barAreaH - barH
          const showLabel = bars.length <= 14 || i % Math.ceil(bars.length / 10) === 0

          return (
            <g key={i} onClick={() => setTapped(tapped === i ? null : i)} style={{ cursor: 'pointer' }}>
              <motion.rect
                x={x}
                y={y}
                width={barW}
                rx={2}
                fill={tapped === i ? '#f5d485' : 'url(#barGrad)'}
                initial={{ height: 0, y: padTop + barAreaH }}
                animate={{ height: barH, y }}
                transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
              />
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={height - 4}
                  fill="#52525b"
                  fontSize={8}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {formatDateShort(item.date).replace('.', '')}
                </text>
              )}
            </g>
          )
        })}

        {/* Tooltip */}
        {tapped !== null && bars[tapped] && (() => {
          const item = bars[tapped]
          const x = padLeft + tapped * (barW + 2)
          const tipX = Math.min(Math.max(x, 60), Math.max(svgW, 300) - 100)
          return (
            <g>
              <rect x={tipX - 55} y={2} width={120} height={32} rx={6} fill="#1c1c1e" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
              <text x={tipX + 5} y={15} fill="#d4af37" fontSize={10} fontWeight={600} textAnchor="middle">
                {formatDateShort(item.date)} — {formatMoneyShort(item.revenue)}
              </text>
              <text x={tipX + 5} y={28} fill="#71717a" fontSize={9} textAnchor="middle">
                {item.orders_count} заказ{item.orders_count === 1 ? '' : item.orders_count < 5 ? 'а' : 'ов'}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
})

/* ═══════ SparkLine (Tiny inline SVG) ═══════ */

interface SparkLineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
}

export const SparkLine = memo(function SparkLine({ values, width = 56, height = 20, color = '#d4af37' }: SparkLineProps) {
  if (!values || values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 1

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2)
      const y = height - pad - ((v - min) / range) * (height - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  const gradId = `spark_${color.replace('#', '')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`${pad},${height} ${points} ${width - pad},${height}`}
        fill={`url(#${gradId})`}
      />
    </svg>
  )
})

/* ═══════ Funnel Bars (Horizontal Status Pipeline) ═══════ */

interface FunnelStage {
  status: string
  count: number
}

interface FunnelBarsProps {
  stages: FunnelStage[]
}

export const FunnelBars = memo(function FunnelBars({ stages }: FunnelBarsProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className={`${s.flexCol} ${s.gap2}`}>
      {stages.map((stage) => {
        const cfg = STATUS_CONFIG[stage.status]
        if (!cfg) return null
        const pct = (stage.count / maxCount) * 100

        return (
          <div key={stage.status} className={s.funnelRow}>
            <div className={s.funnelLabel}>{cfg.emoji} {cfg.label}</div>
            <div className={s.funnelBarTrack}>
              <motion.div
                className={s.funnelBar}
                style={{ background: cfg.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 2)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                {stage.count > 0 && (
                  <span className={s.funnelBarCount}>{stage.count}</span>
                )}
              </motion.div>
            </div>
          </div>
        )
      })}
    </div>
  )
})

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from 'lucide-react'

// Animated Bar Chart
interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  showValues?: boolean
  animated?: boolean
}

export function AnimatedBarChart({
  data,
  height = 150,
  showValues = true,
  animated = true,
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height,
      gap: 8,
      padding: '10px 0',
    }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 30)
        const color = item.color || '#d4af37'

        return (
          <div
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              maxWidth: 60,
            }}
          >
            {/* Value */}
            {showValues && (
              <motion.div
                initial={animated ? { opacity: 0, y: 10 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: color,
                  marginBottom: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.value.toLocaleString('ru-RU')}
              </motion.div>
            )}

            {/* Bar */}
            <motion.div
              initial={animated ? { height: 0 } : { height: barHeight }}
              animate={{ height: barHeight }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${color}, ${color}80)`,
                borderRadius: '6px 6px 2px 2px',
                minHeight: 4,
                boxShadow: `0 0 15px ${color}40`,
              }}
            />

            {/* Label */}
            <motion.div
              initial={animated ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              style={{
                fontSize: 9,
                color: '#71717a',
                marginTop: 6,
                textAlign: 'center',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

// Animated Line Chart
interface LineChartProps {
  data: number[]
  labels?: string[]
  height?: number
  color?: string
  showDots?: boolean
  showArea?: boolean
}

export function AnimatedLineChart({
  data,
  labels,
  height = 120,
  color = '#d4af37',
  showDots = true,
  showArea = true,
}: LineChartProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const maxValue = Math.max(...data, 1)
  const minValue = Math.min(...data, 0)
  const range = maxValue - minValue || 1
  const padding = 20

  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * (280 - padding * 2),
    y: height - padding - ((value - minValue) / range) * (height - padding * 2),
    value,
  }))

  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg width="100%" height={height} viewBox={`0 0 280 ${height}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1={padding}
          y1={padding + (height - padding * 2) * fraction}
          x2={280 - padding}
          y2={padding + (height - padding * 2) * fraction}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      {showArea && (
        <motion.path
          d={areaD}
          fill={`url(#gradient-${color.replace('#', '')})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 0.3 : 0 }}
          transition={{ duration: 1 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isVisible ? 1 : 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
      />

      {/* Dots */}
      {showDots && points.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#0a0a0c"
          stroke={color}
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: isVisible ? 1 : 0, opacity: isVisible ? 1 : 0 }}
          transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
        />
      ))}

      {/* Labels */}
      {labels && labels.map((label, index) => (
        <motion.text
          key={index}
          x={points[index]?.x || 0}
          y={height - 4}
          textAnchor="middle"
          fill="#52525b"
          fontSize="9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + index * 0.05 }}
        >
          {label}
        </motion.text>
      ))}

      {/* Gradient definition */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Animated Donut/Pie Chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  strokeWidth?: number
  showLegend?: boolean
}

export function AnimatedDonutChart({
  data,
  size = 140,
  strokeWidth = 24,
  showLegend = true,
}: DonutChartProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Data segments */}
          {data.map((item, index) => {
            const segmentLength = (item.value / total) * circumference
            const offset = accumulatedOffset
            accumulatedOffset += segmentLength

            return (
              <motion.circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: isVisible ? 1 : 0,
                  opacity: isVisible ? 1 : 0,
                }}
                transition={{
                  duration: 1,
                  delay: index * 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ filter: `drop-shadow(0 0 6px ${item.color}60)` }}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: isVisible ? 1 : 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {total.toLocaleString('ru-RU')}
          </div>
          <div style={{ fontSize: 9, color: '#71717a' }}>всего</div>
        </motion.div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: item.color,
                boxShadow: `0 0 8px ${item.color}60`,
              }} />
              <div>
                <div style={{ fontSize: 11, color: '#a1a1aa' }}>{item.label}</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {item.value.toLocaleString('ru-RU')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// Stat Card with Trend
interface StatTrendCardProps {
  title: string
  value: number
  previousValue?: number
  suffix?: string
  prefix?: string
  icon?: typeof TrendingUp
  color?: string
}

export function StatTrendCard({
  title,
  value,
  previousValue,
  suffix = '',
  prefix = '',
  icon: Icon = Activity,
  color = '#d4af37',
}: StatTrendCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const trend = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
  const isPositive = trend >= 0

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic

      setDisplayValue(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(20, 20, 23, 0.7)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>

        {previousValue !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isPositive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: isPositive ? '#22c55e' : '#ef4444',
          }}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#fff',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {prefix}{displayValue.toLocaleString('ru-RU')}{suffix}
        </div>
        <div style={{
          fontSize: 11,
          color: '#71717a',
          marginTop: 2,
        }}>
          {title}
        </div>
      </div>
    </motion.div>
  )
}

// Mini sparkline chart
interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({
  data,
  color = '#d4af37',
  width = 80,
  height = 24,
}: SparklineProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - minValue) / range) * height,
  }))

  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <svg width={width} height={height}>
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isVisible ? 1 : 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

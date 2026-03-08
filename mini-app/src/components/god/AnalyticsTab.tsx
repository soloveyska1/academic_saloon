/**
 * God Mode v3 — Analytics Tab (⭐ NEW)
 * Period selector · Revenue chart · Week comparison · KPI tiles · Funnel
 */
import { memo, useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchRevenueChart, fetchAdminStats, fetchGodDashboard } from '../../api/userApi'
import type { GodDashboard } from '../../types'
import {
  CHART_PERIODS, STATUS_PIPELINE, STATUS_CONFIG,
  formatMoney, formatMoneyShort, formatTrend,
} from './godConstants'
import { useGodData } from './godHooks'
import { KPICard, Skeleton, StateCard } from './GodWidgets'
import { RevenueChart, FunnelBars } from './GodCharts'
import s from '../../pages/GodModePage.module.css'

export const AnalyticsTab = memo(function AnalyticsTab() {
  const [days, setDays] = useState(7)

  const fetchChart = useCallback(() => fetchRevenueChart(days), [days])
  const fetchStats = useCallback(() => fetchAdminStats(), [])
  const fetchDash = useCallback(() => fetchGodDashboard(), [])

  const chart = useGodData(fetchChart, { interval: 60000 })
  const stats = useGodData(fetchStats, { interval: 30000 })
  const dash = useGodData<GodDashboard>(fetchDash, { interval: 30000 })

  const revenueTrend = useMemo(() => {
    if (!stats.data?.revenue_this_week || !stats.data?.revenue_last_week) return null
    return formatTrend(stats.data.revenue_this_week, stats.data.revenue_last_week)
  }, [stats.data])

  const funnelStages = useMemo(() => {
    if (!dash.data?.orders.by_status) return []
    return STATUS_PIPELINE
      .filter((st) => (dash.data!.orders.by_status[st] ?? 0) > 0)
      .map((st) => {
        const count = dash.data!.orders.by_status[st] || 0
        return { status: st, count }
      })
  }, [dash.data])

  const totalFunnel = useMemo(
    () => funnelStages.reduce((sum, s) => sum + s.count, 0),
    [funnelStages],
  )

  const totalRevenue = useMemo(() => {
    if (!chart.data?.data) return 0
    return chart.data.data.reduce((sum: number, d: { revenue: number }) => sum + d.revenue, 0)
  }, [chart.data])

  const avgDailyRevenue = useMemo(() => {
    if (!chart.data?.data || !chart.data.data.length) return 0
    return totalRevenue / chart.data.data.length
  }, [chart.data, totalRevenue])

  if (chart.loading && !chart.data) {
    return <Skeleton variant="chart" count={1} />
  }

  if (chart.error && !chart.data) {
    return <StateCard tone="error" title="Аналитика недоступна" description={chart.error} actionLabel="Повторить" onAction={chart.refresh} />
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

      {/* Period Selector */}
      <div className={s.periodSelector}>
        {CHART_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            className={days === p.days ? s.periodBtnActive : s.periodBtn}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Revenue Chart */}
      {chart.data?.data && chart.data.data.length > 0 && (
        <div className={s.chartWrap}>
          <div className={s.chartHeader}>
            <div className={s.chartTitle}>Выручка за {days} дней</div>
            <span className={s.tagGold}>{formatMoney(totalRevenue)}</span>
          </div>
          <RevenueChart data={chart.data.data} height={200} />
        </div>
      )}

      {/* Week Comparison */}
      {stats.data && (
        <div className={s.weekCompare}>
          <div className={s.weekCompareRow}>
            <div className={s.weekCompareBlock}>
              <div className={s.mutedSmall}>Эта неделя</div>
              <div className={`${s.textGold} ${s.bold}`} style={{ fontSize: 18 }}>
                {formatMoney(stats.data.revenue_this_week)}
              </div>
            </div>
            <div className={s.weekCompareVs}>vs</div>
            <div className={s.weekCompareBlock}>
              <div className={s.mutedSmall}>Прошлая</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#a1a1aa' }}>
                {formatMoney(stats.data.revenue_last_week)}
              </div>
            </div>
          </div>
          {revenueTrend && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className={revenueTrend.positive ? s.kpiTrendUp : s.kpiTrendDown} style={{ fontSize: 16 }}>
                {revenueTrend.positive ? '↑' : '↓'} {revenueTrend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI Summary */}
      <div className={s.kpiGrid}>
        <KPICard
          label="Ср. чек"
          value={formatMoney(stats.data?.average_order_value ?? dash.data?.revenue.average_order)}
          accent="#22c55e"
        />
        <KPICard
          label="Ср. день"
          value={formatMoney(avgDailyRevenue)}
          accent="#d4af37"
        />
        <KPICard
          label="Заказов"
          value={dash.data?.orders.total ?? '—'}
          accent="#6366f1"
        />
        <KPICard
          label="Клиентов"
          value={dash.data?.users.total ?? '—'}
          accent="#3b82f6"
        />
      </div>

      {/* Funnel with Conversion */}
      {funnelStages.length > 0 && (
        <div className={s.chartWrap}>
          <div className={s.chartHeader}>
            <div className={s.chartTitle}>Воронка заказов</div>
            <span className={s.tagMuted}>{totalFunnel} активных</span>
          </div>
          <FunnelBars stages={funnelStages} />

          {/* Conversion rates */}
          <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`} style={{ marginTop: 10 }}>
            {funnelStages.map((stage, i) => {
              if (i === 0 || !totalFunnel) return null
              const pct = ((stage.count / funnelStages[0].count) * 100).toFixed(0)
              const cfg = STATUS_CONFIG[stage.status]
              return (
                <span key={stage.status} className={s.tagMuted} style={{ fontSize: 10 }}>
                  {cfg?.emoji} {pct}%
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Revenue Breakdown */}
      {dash.data && (
        <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`}>
          <span className={s.tagGold}>Сегодня: {formatMoneyShort(dash.data.revenue.today)}</span>
          <span className={s.tagGreen}>Неделя: {formatMoneyShort(dash.data.revenue.week)}</span>
          <span className={s.tagBlue}>Месяц: {formatMoneyShort(dash.data.revenue.month)}</span>
          <span className={s.tagMuted}>Всего: {formatMoneyShort(dash.data.revenue.total)}</span>
        </div>
      )}
    </motion.div>
  )
})

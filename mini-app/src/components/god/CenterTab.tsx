/**
 * God Mode v3 — Command Center (Dashboard 2.0)
 * Revenue ticker · Alert strip · KPI grid · Mini chart · Funnel · Pulse
 */
import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { fetchGodDashboard, fetchGodOrders, fetchRevenueChart, fetchAdminStats } from '../../api/userApi'
import type { GodDashboard, GodOrder } from '../../types'
import { formatMoney, formatTrend, STATUS_PIPELINE } from './godConstants'
import { useGodData, useHaptic } from './godHooks'
import { KPICard, AlertStrip, Skeleton, StateCard } from './GodWidgets'
import { RevenueChart, FunnelBars } from './GodCharts'
import s from '../../pages/GodModePage.module.css'

export const CenterTab = memo(function CenterTab() {
  const { impact } = useHaptic()

  const fetchDash = useCallback(() => fetchGodDashboard(), [])
  const fetchChart = useCallback(() => fetchRevenueChart(7), [])
  const fetchStats = useCallback(() => fetchAdminStats(), [])
  const fetchPending = useCallback(() => fetchGodOrders({ status: 'verification_pending', limit: 10 }), [])

  const dash = useGodData<GodDashboard>(fetchDash, { interval: 15000 })
  const chart = useGodData(fetchChart, { interval: 60000 })
  const stats = useGodData(fetchStats, { interval: 30000 })
  const pending = useGodData<{ orders: GodOrder[]; total: number }>(fetchPending, { interval: 10000 })

  const revenueTrend = useMemo(() => {
    if (!stats.data?.revenue_this_week || !stats.data?.revenue_last_week) return null
    return formatTrend(stats.data.revenue_this_week, stats.data.revenue_last_week)
  }, [stats.data])

  const sparkData = useMemo(() => {
    if (!chart.data?.data) return undefined
    return chart.data.data.map((d: { revenue: number }) => d.revenue)
  }, [chart.data])

  const funnelStages = useMemo(() => {
    if (!dash.data?.orders.by_status) return []
    return STATUS_PIPELINE
      .filter((st) => (dash.data!.orders.by_status[st] ?? 0) > 0)
      .map((st) => ({ status: st, count: dash.data!.orders.by_status[st] || 0 }))
  }, [dash.data])

  const pendingOrders = useMemo(() => {
    if (!pending.data?.orders) return []
    return pending.data.orders.map((o) => ({
      id: o.id,
      label: o.user_fullname || 'Без имени',
      sublabel: o.work_type_label || o.work_type,
      amount: o.paid_amount || o.final_price || o.price,
    }))
  }, [pending.data])

  const handleConfirm = useCallback(async (id: number) => {
    impact('medium')
    try {
      const { confirmGodPayment } = await import('../../api/userApi')
      await confirmGodPayment(id)
      pending.refresh()
      dash.refresh()
    } catch { /* silent */ }
  }, [impact, pending, dash])

  const handleReject = useCallback(async (id: number) => {
    impact('medium')
    try {
      const { rejectGodPayment } = await import('../../api/userApi')
      await rejectGodPayment(id)
      pending.refresh()
      dash.refresh()
    } catch { /* silent */ }
  }, [impact, pending, dash])

  if (dash.loading && !dash.data) {
    return <Skeleton variant="stat" count={4} />
  }

  if (dash.error && !dash.data) {
    return <StateCard tone="error" title="Сводка недоступна" description={dash.error} actionLabel="Повторить" onAction={dash.refresh} />
  }

  const d = dash.data!

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

      {/* Revenue Ticker */}
      <div className={s.revenueTicker}>
        <div className={s.tickerValue}>{formatMoney(d.revenue.today)}</div>
        <div className={s.tickerLabel}>сегодня</div>
        {revenueTrend && (
          <span className={revenueTrend.positive ? s.kpiTrendUp : s.kpiTrendDown} style={{ marginLeft: 'auto' }}>
            {revenueTrend.positive ? '↑' : '↓'} {revenueTrend.value.toFixed(1)}% vs пр. неделю
          </span>
        )}
      </div>

      {/* Alert Strip — pending payments */}
      {pendingOrders.length > 0 && (
        <div>
          <div className={s.sectionTitle}>Ожидают подтверждения ({pendingOrders.length})</div>
          <AlertStrip items={pendingOrders} onConfirm={handleConfirm} onReject={handleReject} />
        </div>
      )}

      {/* KPI Grid */}
      <div className={s.kpiGrid}>
        <KPICard
          label="Выручка (неделя)"
          value={formatMoney(stats.data?.revenue_this_week ?? d.revenue.week)}
          trend={revenueTrend ?? undefined}
          sparkData={sparkData}
          accent="#d4af37"
        />
        <KPICard
          label="Активных заказов"
          value={d.orders.active}
          accent="#6366f1"
        />
        <KPICard
          label="Клиентов"
          value={d.users.total}
          accent="#3b82f6"
        />
        <KPICard
          label="Ср. чек"
          value={formatMoney(stats.data?.average_order_value ?? d.revenue.average_order)}
          accent="#22c55e"
        />
      </div>

      {/* Mini Revenue Chart */}
      {chart.data?.data && chart.data.data.length > 0 && (
        <div className={s.chartWrap}>
          <div className={s.chartHeader}>
            <div className={s.chartTitle}>Выручка за 7 дней</div>
          </div>
          <RevenueChart data={chart.data.data} height={140} />
        </div>
      )}

      {/* Order Funnel */}
      {funnelStages.length > 0 && (
        <div className={s.chartWrap}>
          <div className={s.chartHeader}>
            <div className={s.chartTitle}>Воронка заказов</div>
            <span className={s.tagMuted}>{d.orders.total} всего</span>
          </div>
          <FunnelBars stages={funnelStages} />
        </div>
      )}

      {/* Quick Pulse */}
      <div className={s.pulseRow}>
        <div className={s.onlineDot} />
        <span className={s.onlineCount} style={{ fontSize: 14 }}>{d.users.online || 0}</span>
        <span className={s.muted}>онлайн</span>
        <button type="button" className={`${s.ghostBtn} ${s.mlAuto}`} onClick={() => { dash.refresh(); stats.refresh(); chart.refresh() }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats Summary */}
      <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`}>
        <span className={s.tagGold}>Сегодня: {d.orders.today} заказов</span>
        <span className={s.tagGreen}>Завершено: {d.orders.completed_today || 0}</span>
        <span className={s.tagMuted}>Новых юзеров: {d.users.today}</span>
      </div>
    </motion.div>
  )
})

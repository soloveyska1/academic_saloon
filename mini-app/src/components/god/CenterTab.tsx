/**
 * God Mode v3 — Command Center
 * Owner overview · fast routes · live review rail · insight panels
 */
import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, ClipboardCheck, Radar, RefreshCw, ShieldAlert, Users,
} from 'lucide-react'
import { fetchGodDashboard, fetchGodOrders, fetchRevenueChart, fetchAdminStats } from '../../api/userApi'
import type { GodDashboard, GodOrder } from '../../types'
import {
  formatMoney, formatMoneyShort, formatTrend, STATUS_PIPELINE, type TabId,
} from './godConstants'
import { useGodData, useHaptic } from './godHooks'
import { AlertStrip, Skeleton, StateCard } from './GodWidgets'
import { RevenueChart, FunnelBars } from './GodCharts'
import s from '../../pages/GodModePage.module.css'

interface CenterTabProps {
  onRouteJump?: (target: { tab: TabId; params?: Record<string, string | null | undefined> }) => void
}

const ACTIVITY_LABELS: Record<string, string> = {
  order: 'Заказ',
  payment: 'Оплата',
  user: 'Клиент',
  system: 'Система',
}

function getPaymentMethodLabel(method?: string | null): string {
  switch (method) {
    case 'sbp':
      return 'СБП'
    case 'card':
      return 'Карта'
    case 'transfer':
      return 'Перевод'
    case 'yookassa':
      return 'ЮKassa'
    default:
      return 'Платёж'
  }
}

function getPaymentPhaseLabel(phase?: string | null): string {
  return phase === 'final' ? 'Доплата' : 'Оплата'
}

export const CenterTab = memo(function CenterTab({ onRouteJump }: CenterTabProps) {
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
      sublabel: [
        o.work_type_label || o.work_type,
        `${getPaymentPhaseLabel(o.payment_phase)} · ${getPaymentMethodLabel(o.payment_method)}`,
        o.payment_is_batch && (o.payment_batch_orders_count || 0) > 1
          ? `Общая заявка: ${o.payment_batch_orders_count} · ${formatMoney(o.payment_batch_total_amount || 0)}`
          : null,
      ].filter(Boolean).join(' · '),
      amount: o.payment_requested_amount || o.pending_verification_amount || o.paid_amount || o.final_price || o.price,
    }))
  }, [pending.data])

  const quickRoutes = useMemo(() => [
    {
      key: 'payments',
      label: 'Оплаты',
      value: String(pending.data?.total ?? pendingOrders.length),
      note: 'На подтверждении',
      icon: <ClipboardCheck size={15} />,
      onClick: () => onRouteJump?.({ tab: 'orders', params: { order_status: 'verification_pending' } }),
    },
    {
      key: 'attention',
      label: 'Заказы',
      value: String(dash.data?.orders.needing_attention ?? 0),
      note: 'Требуют внимания',
      icon: <ShieldAlert size={15} />,
      onClick: () => onRouteJump?.({ tab: 'orders' }),
    },
    {
      key: 'clients',
      label: 'Клиенты',
      value: String(dash.data?.users.watched ?? 0),
      note: 'На контроле',
      icon: <Users size={15} />,
      onClick: () => onRouteJump?.({ tab: 'clients', params: { user_filter: 'watched' } }),
    },
    {
      key: 'radar',
      label: 'Радар',
      value: String(dash.data?.users.online ?? 0),
      note: 'Сейчас онлайн',
      icon: <Radar size={15} />,
      onClick: () => onRouteJump?.({ tab: 'radar' }),
    },
  ], [dash.data, onRouteJump, pending.data?.total, pendingOrders.length])

  const focusMetrics = useMemo(() => {
    if (!dash.data) return []

    return [
      {
        label: 'В работе',
        value: String(dash.data.orders.active),
      },
      {
        label: 'Неделя',
        value: formatMoneyShort(stats.data?.revenue_this_week ?? dash.data.revenue.week),
      },
      {
        label: 'Ср. чек',
        value: formatMoneyShort(stats.data?.average_order_value ?? dash.data.revenue.average_order),
      },
      {
        label: 'Бонусы',
        value: formatMoneyShort(dash.data.users.total_bonus_balance),
      },
    ]
  }, [dash.data, stats.data?.average_order_value, stats.data?.revenue_this_week])

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
  const lastEvent = stats.data?.recent_activity?.[0]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>
      <div className={s.centerHeroGrid}>
        <section className={s.centerHero}>
          <div className={s.centerHeroTop}>
            <div>
              <div className={s.panelEyebrow}>Командный центр</div>
              <div className={s.centerHeroTitle}>Сегодня</div>
            </div>
            <button
              type="button"
              className={s.refreshChip}
              onClick={() => {
                dash.refresh()
                stats.refresh()
                chart.refresh()
                pending.refresh()
              }}
            >
              <RefreshCw size={14} />
              Обновить
            </button>
          </div>

          <div className={s.centerHeroValue}>{formatMoney(d.revenue.today)}</div>

          <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`}>
            <span className={s.tagGold}>{d.orders.today} заказов</span>
            <span className={s.tagGreen}>{d.orders.completed_today || 0} завершено</span>
            <span className={s.tagMuted}>{d.users.today} новых</span>
            <span className={s.tagMuted}>{d.users.online || 0} онлайн</span>
          </div>

          <div className={s.centerMetrics}>
            {focusMetrics.map((metric) => (
              <div key={metric.label} className={s.centerMetric}>
                <div className={s.centerMetricValue}>{metric.value}</div>
                <div className={s.centerMetricLabel}>{metric.label}</div>
              </div>
            ))}
          </div>

          {lastEvent && (
            <div className={s.centerHeroFooter}>
              <span className={s.tagMuted}>{ACTIVITY_LABELS[lastEvent.type] || 'Событие'}</span>
              <span className={s.centerHeroFootnote}>{lastEvent.message}</span>
            </div>
          )}
        </section>

        <section className={s.commandPanel}>
          <div className={s.panelHead}>
            <div className={s.panelEyebrow}>Быстрый ход</div>
            {revenueTrend && (
              <span className={revenueTrend.positive ? s.kpiTrendUp : s.kpiTrendDown}>
                {revenueTrend.positive ? '↑' : '↓'} {revenueTrend.value.toFixed(1)}%
              </span>
            )}
          </div>
          <div className={s.commandGrid}>
            {quickRoutes.map((item) => (
              <button
                key={item.key}
                type="button"
                className={s.commandTile}
                onClick={item.onClick}
              >
                <div className={s.commandTileIcon}>{item.icon}</div>
                <div className={s.commandTileBody}>
                  <div className={s.commandTileValue}>{item.value}</div>
                  <div className={s.commandTileTitle}>{item.label}</div>
                  <div className={s.commandTileMeta}>{item.note}</div>
                </div>
                <ArrowRight size={14} className={s.commandTileArrow} />
              </button>
            ))}
          </div>
        </section>
      </div>

      {pendingOrders.length > 0 && (
        <section className={s.surfacePanel}>
          <div className={s.surfacePanelHeader}>
            <div className={s.sectionTitle}>На подтверждении</div>
            <button
              type="button"
              className={s.inlineLinkBtn}
              onClick={() => onRouteJump?.({ tab: 'orders', params: { order_status: 'verification_pending' } })}
            >
              Все оплаты
            </button>
          </div>
          <AlertStrip items={pendingOrders} onConfirm={handleConfirm} onReject={handleReject} />
        </section>
      )}

      <div className={s.insightGrid}>
        {chart.data?.data && chart.data.data.length > 0 && (
          <div className={s.chartWrap}>
            <div className={s.chartHeader}>
              <div className={s.chartTitle}>Выручка за 7 дней</div>
              <span className={s.tagGold}>{formatMoneyShort(d.revenue.week)}</span>
            </div>
            <RevenueChart data={chart.data.data} height={128} />
          </div>
        )}

        {funnelStages.length > 0 && (
          <div className={s.chartWrap}>
            <div className={s.chartHeader}>
              <div className={s.chartTitle}>Воронка заказов</div>
              <span className={s.tagMuted}>{d.orders.total} всего</span>
            </div>
            <FunnelBars stages={funnelStages} />
          </div>
        )}
      </div>
    </motion.div>
  )
})

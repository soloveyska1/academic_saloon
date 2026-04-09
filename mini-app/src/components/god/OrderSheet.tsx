/**
 * God Mode v3 — Order Detail Bottom Sheet
 * Tabs: Инфо | Чат | Хронология
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { Send, Check, X, ExternalLink } from 'lucide-react'
import {
  fetchGodOrderDetails, updateGodOrderStatus, updateGodOrderPrice,
  updateGodOrderProgress, updateGodOrderNotes, confirmGodPayment,
  rejectGodPayment, sendGodOrderMessage,
} from '../../api/userApi'
import type { GodOrder, GodUser, GodOrderMessage } from '../../types'
import { STATUS_CONFIG, formatMoney, formatDateTime } from './godConstants'
import { useHaptic } from './godHooks'
import { useToast } from '../ui/Toast'
import { BottomSheet } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

const SHEET_TABS = [
  { id: 'info', label: 'Инфо' },
  { id: 'chat', label: 'Чат' },
  { id: 'timeline', label: 'Хронология' },
]

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
      return 'Не указан'
  }
}

function getPaymentPhaseLabel(phase?: string | null): string {
  return phase === 'final' ? 'Доплата' : 'Оплата'
}

function getRevisionRoundStatusLabel(status?: string | null): string {
  switch (status) {
    case 'open':
      return 'Открыта'
    case 'fulfilled':
      return 'Закрыта'
    case 'cancelled':
      return 'Отменена'
    default:
      return 'Правка'
  }
}

function getTimelineDotColor(accent?: string): string {
  switch (accent) {
    case 'success':
      return 'var(--success-text)'
    case 'warning':
      return 'var(--warning-text)'
    case 'danger':
      return 'var(--danger-text)'
    case 'info':
      return '#6366f1'
    case 'gold':
      return 'var(--gold-400)'
    default:
      return 'var(--text-muted)'
  }
}

function getOperationalToneColors(tone?: string): { border: string; background: string; text: string } {
  switch (tone) {
    case 'success':
      return {
        border: 'rgba(34, 197, 94, 0.3)',
        background: 'rgba(34, 197, 94, 0.08)',
        text: 'var(--success-text)',
      }
    case 'warning':
      return {
        border: 'rgba(245, 158, 11, 0.3)',
        background: 'rgba(245, 158, 11, 0.08)',
        text: 'var(--warning-text)',
      }
    case 'danger':
      return {
        border: 'rgba(239, 68, 68, 0.28)',
        background: 'rgba(239, 68, 68, 0.08)',
        text: 'var(--error-text)',
      }
    case 'info':
      return {
        border: 'rgba(99, 102, 241, 0.28)',
        background: 'rgba(99, 102, 241, 0.08)',
        text: '#818cf8',
      }
    case 'gold':
      return {
        border: 'rgba(212, 175, 55, 0.3)',
        background: 'rgba(212, 175, 55, 0.08)',
        text: 'var(--gold-400)',
      }
    default:
      return {
        border: 'var(--border-default)',
        background: 'rgba(255,255,255,0.02)',
        text: 'var(--text-primary)',
      }
  }
}

interface OrderSheetProps {
  orderId: number | null
  onClose: () => void
}

export const OrderSheet = memo(function OrderSheet({ orderId, onClose }: OrderSheetProps) {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const [tab, setTab] = useState('info')
  const [order, setOrder] = useState<GodOrder | null>(null)
  const [user, setUser] = useState<GodUser | null>(null)
  const [messages, setMessages] = useState<GodOrderMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [newStatus, setNewStatus] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newProgress, setNewProgress] = useState(0)
  const [notes, setNotes] = useState('')
  const [msgText, setMsgText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const r = await fetchGodOrderDetails(orderId)
      setOrder(r.order)
      setUser(r.user)
      setMessages((r.messages || []) as GodOrderMessage[])
      setNewStatus(r.order.status)
      setNewPrice(String(r.order.price || ''))
      setNewProgress(r.order.progress || 0)
      setNotes(r.order.admin_notes || '')
    } catch { showToast({ type: 'error', title: 'Не удалось загрузить' }) }
    setLoading(false)
  }, [orderId, showToast])

  useEffect(() => { if (orderId) { setTab('info'); load() } }, [orderId, load])

  const act = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    impact('medium')
    try {
      await fn()
      notify('success')
      showToast({ type: 'success', title: label })
      load()
    } catch (e) {
      notify('error')
      showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось выполнить действие. Попробуйте позже.' })
    }
    setBusy(false)
  }, [impact, notify, showToast, load])

  if (!orderId) return null

  const cfg = order ? STATUS_CONFIG[order.status] : null
  const isVerification = order?.status === 'verification_pending'
  const operationalTone = getOperationalToneColors(order?.operational_summary?.tone)
  const currentRevisionRound = order?.current_revision_round || null
  const revisionHistory = order?.revision_history || []
  const archivedRevisionRounds = revisionHistory.filter((item) => item.id !== currentRevisionRound?.id)
  const revisionRoundMap = new Map(
    [...revisionHistory, ...(currentRevisionRound ? [currentRevisionRound] : [])].map((item) => [item.id, item]),
  )

  return (
    <BottomSheet
      isOpen={!!orderId}
      onClose={onClose}
      title={order ? `Заказ #${order.id}` : 'Загрузка...'}
      tabs={SHEET_TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {loading && !order ? (
        <div className={s.mutedSmall} style={{ padding: 24, textAlign: 'center' }}>Загрузка...</div>
      ) : order ? (
        <>
          {/* ═══════ INFO TAB ═══════ */}
          {tab === 'info' && (
            <div className={`${s.flexCol} ${s.gap10}`}>
              {/* Status */}
              {cfg && (
                <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color, alignSelf: 'flex-start' }}>
                  {cfg.emoji} {cfg.label}
                </span>
              )}

              {order.operational_summary && (
                <div
                  className={s.card}
                  style={{
                    borderColor: operationalTone.border,
                    background: `linear-gradient(180deg, ${operationalTone.background}, rgba(255,255,255,0.02))`,
                  }}
                >
                  <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ alignItems: 'center' }}>
                    <span className={s.tagMuted}>Сейчас</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: operationalTone.text }}>
                      {order.operational_summary.title}
                    </div>
                  </div>

                  {order.operational_summary.subtitle && (
                    <div className={s.mutedSmall} style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                      {order.operational_summary.subtitle}
                    </div>
                  )}

                  {order.operational_summary.next_action && (
                    <div
                      className={s.card}
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className={s.mutedSmall}>Следующее действие</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                        {order.operational_summary.next_action}
                      </div>
                    </div>
                  )}

                  {order.operational_summary.items && order.operational_summary.items.length > 0 && (
                    <div className={`${s.flexCol} ${s.gap6}`} style={{ marginTop: 10 }}>
                      <div className={s.mutedSmall}>Последние события</div>
                      {order.operational_summary.items.map((item) => (
                        <div
                          key={item.id}
                          className={s.card}
                          style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}
                        >
                          <div className={`${s.flexRow} ${s.gap8}`} style={{ alignItems: 'flex-start' }}>
                            <div
                              className={s.timelineDot}
                              style={{
                                borderColor: getTimelineDotColor(item.accent),
                                marginTop: 4,
                                flexShrink: 0,
                              }}
                            />
                            <div className={s.flex1}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.title}
                              </div>
                              {item.details && (
                                <div className={s.mutedSmall} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                  {item.details}
                                </div>
                              )}
                              {item.timestamp && (
                                <div className={s.mutedSmall} style={{ marginTop: 4 }}>
                                  {formatDateTime(item.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Order Info */}
              <div className={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{order.work_type_label || order.work_type}</div>
                {order.subject && <div className={s.mutedSmall}>Предмет: {order.subject}</div>}
                {order.topic && <div className={s.mutedSmall}>Тема: {order.topic}</div>}
                {order.deadline && <div className={s.mutedSmall}>Дедлайн: {formatDateTime(order.deadline)}</div>}
              </div>

              {/* User Info */}
              {user && (
                <div className={s.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.fullname || 'Без имени'} {user.username ? `@${user.username}` : ''}
                  </div>
                  <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ marginTop: 8 }}>
                    <span className={s.tagGold}>{formatMoney(user.balance)}</span>
                    <span className={s.tagMuted}>{user.orders_count} заказов</span>
                    <span className={s.tagMuted}>{formatMoney(user.total_spent)} потрачено</span>
                  </div>
                </div>
              )}

              {/* Promo Info */}
              {order.promo_code && (
                <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`}>
                  <span className={s.tagGold}>{order.promo_code} −{order.promo_discount}%</span>
                  <span className={s.tagGreen}>Экономия: {formatMoney(order.promo_discount_amount)}</span>
                  {order.promo_returned && <span className={s.tagRed}>Возвращён</span>}
                </div>
              )}

              {/* Price Summary */}
              <div className={s.card}>
                <div className={`${s.flexRow} ${s.gap8}`}>
                  <div className={s.flex1}>
                    <div className={s.mutedSmall}>Цена</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-400)' }}>{formatMoney(order.final_price || order.price)}</div>
                  </div>
                  <div>
                    <div className={s.mutedSmall}>Оплачено</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: order.paid_amount >= (order.final_price || order.price) ? 'var(--success-text)' : 'var(--warning-text)' }}>
                      {formatMoney(order.paid_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {isVerification && (
                <div className={s.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Проверка оплаты</div>
                  <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`} style={{ marginTop: 8 }}>
                    <span className={s.tagGold}>
                      {formatMoney(order.payment_requested_amount || order.pending_verification_amount || order.final_price || order.price)}
                    </span>
                    <span className={s.tagMuted}>{getPaymentPhaseLabel(order.payment_phase)}</span>
                    <span className={s.tagMuted}>{getPaymentMethodLabel(order.payment_method)}</span>
                    {order.payment_requested_at && (
                      <span className={s.tagMuted}>{formatDateTime(order.payment_requested_at)}</span>
                    )}
                  </div>

                  {order.payment_is_batch && (order.payment_batch_orders_count || 0) > 1 && (
                    <>
                      <div className={s.mutedSmall} style={{ marginTop: 10 }}>
                        Общая заявка: {order.payment_batch_orders_count} заказ(ов) на {formatMoney(order.payment_batch_total_amount || 0)}
                      </div>
                      {order.payment_batch_orders && order.payment_batch_orders.length > 0 && (
                        <div className={`${s.flexCol} ${s.gap6}`} style={{ marginTop: 8 }}>
                          {order.payment_batch_orders.map((item) => (
                            <div
                              key={item.id}
                              className={s.card}
                              style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}
                            >
                              <div className={`${s.flexRow} ${s.gap8}`}>
                                <div className={s.flex1}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                    #{item.id} · {item.work_type_label}
                                  </div>
                                  <div className={s.mutedSmall}>
                                    {item.subject || item.topic || 'Без темы'} · {item.status}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>
                                    {formatMoney(item.amount_to_pay)}
                                  </div>
                                  <div className={s.mutedSmall}>{getPaymentPhaseLabel(item.payment_phase)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Materials */}
              {order.description && (
                <div className={s.formSection}>
                  <div className={s.formLabel}>Описание</div>
                  <div className={s.mutedSmall} style={{ whiteSpace: 'pre-wrap' }}>{order.description}</div>
                </div>
              )}

              {(currentRevisionRound || revisionHistory.length > 0) && (
                <div className={s.card}>
                  <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Правки</div>
                    {currentRevisionRound ? (
                      <span className={s.tagGold}>Открыта правка #{currentRevisionRound.round_number}</span>
                    ) : (
                      <span className={s.tagMuted}>История: {revisionHistory.length}</span>
                    )}
                  </div>

                  {currentRevisionRound && (
                    <div
                      className={s.card}
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: 'rgba(245, 158, 11, 0.08)',
                        borderColor: 'rgba(245, 158, 11, 0.24)',
                      }}
                    >
                      <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-text)' }}>
                          Правка #{currentRevisionRound.round_number}
                        </div>
                        <span className={s.tagMuted}>{getRevisionRoundStatusLabel(currentRevisionRound.status)}</span>
                        {(currentRevisionRound.message_count || 0) > 0 && (
                          <span className={s.tagMuted}>Сообщений: {currentRevisionRound.message_count}</span>
                        )}
                        {(currentRevisionRound.attachment_count || 0) > 0 && (
                          <span className={s.tagMuted}>Вложений: {currentRevisionRound.attachment_count}</span>
                        )}
                      </div>
                      {(currentRevisionRound.latest_activity_at || currentRevisionRound.last_client_activity_at) && (
                        <div className={s.mutedSmall} style={{ marginTop: 6 }}>
                          Последняя активность: {formatDateTime(currentRevisionRound.latest_activity_at || currentRevisionRound.last_client_activity_at || null)}
                        </div>
                      )}
                      {(currentRevisionRound.last_client_message_preview || currentRevisionRound.initial_comment) && (
                        <div className={s.mutedSmall} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                          {currentRevisionRound.last_client_message_preview || currentRevisionRound.initial_comment}
                        </div>
                      )}
                    </div>
                  )}

                  {archivedRevisionRounds.length > 0 && (
                    <div className={`${s.flexCol} ${s.gap6}`} style={{ marginTop: 10 }}>
                      {archivedRevisionRounds.slice(0, 4).map((round) => (
                        <div
                          key={round.id}
                          className={s.card}
                          style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}
                        >
                          <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ alignItems: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              Правка #{round.round_number}
                            </div>
                            <span className={s.tagMuted}>{getRevisionRoundStatusLabel(round.status)}</span>
                            {round.closed_by_delivery_version_number && (
                              <span className={s.tagGreen}>Закрыта v{round.closed_by_delivery_version_number}</span>
                            )}
                          </div>
                          {(round.latest_activity_at || round.closed_at || round.requested_at) && (
                            <div className={s.mutedSmall} style={{ marginTop: 6 }}>
                              {formatDateTime(round.latest_activity_at || round.closed_at || round.requested_at || null)}
                            </div>
                          )}
                          {(round.last_client_message_preview || round.initial_comment) && (
                            <div className={s.mutedSmall} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                              {round.last_client_message_preview || round.initial_comment}
                            </div>
                          )}
                          <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ marginTop: 6 }}>
                            {(round.message_count || 0) > 0 && (
                              <span className={s.tagMuted}>Сообщений: {round.message_count}</span>
                            )}
                            {(round.attachment_count || 0) > 0 && (
                              <span className={s.tagMuted}>Вложений: {round.attachment_count}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(order.deliveries_count || order.files_url) ? (
                <div className={s.card}>
                  <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Выдача клиенту</div>
                    {(order.deliveries_count || 0) > 0 && (
                      <span className={s.tagGreen}>Файлов: {order.deliveries_count}</span>
                    )}
                    {order.last_deliverable_at && (
                      <span className={s.tagMuted}>Последняя: {formatDateTime(order.last_deliverable_at)}</span>
                    )}
                  </div>

                  {order.latest_delivery && (
                    <div className={s.card} style={{ marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
                      <div className={`${s.flexRow} ${s.gap8}`} style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div className={s.flex1}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {order.latest_delivery.version_number
                              ? `Последняя версия · v${order.latest_delivery.version_number}`
                              : 'Последняя версия'}
                          </div>
                          <div className={s.mutedSmall}>
                            {order.latest_delivery.sent_at ? formatDateTime(order.latest_delivery.sent_at) : 'Дата выдачи обновится автоматически'}
                            {(order.latest_delivery.file_count || 0) > 0 ? ` · ${order.latest_delivery.file_count} файл(ов)` : ''}
                          </div>
                          {order.latest_delivery.manager_comment && (
                            <div className={s.mutedSmall} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                              {order.latest_delivery.manager_comment}
                            </div>
                          )}
                        </div>
                        {(order.latest_delivery.files_url || order.files_url) && (
                          <a
                            href={order.latest_delivery.files_url || order.files_url || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.secondaryBtn}
                            style={{ alignSelf: 'center' }}
                          >
                            <ExternalLink size={12} /> Открыть
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {order.files_url && (
                    <a
                      href={order.files_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.secondaryBtn}
                      style={{ marginTop: 10 }}
                    >
                      <ExternalLink size={12} /> Папка заказа
                    </a>
                  )}

                  {order.delivery_history && order.delivery_history.length > 1 && (
                    <div className={`${s.flexCol} ${s.gap6}`} style={{ marginTop: 10 }}>
                      {order.delivery_history.slice(1, 5).map((batch) => (
                        <div
                          key={batch.id}
                          className={s.card}
                          style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}
                        >
                          <div className={`${s.flexRow} ${s.gap8}`} style={{ alignItems: 'flex-start' }}>
                            <div className={s.flex1}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {batch.version_number ? `Версия ${batch.version_number}` : 'Выдача'}
                              </div>
                              <div className={s.mutedSmall}>
                                {batch.sent_at ? formatDateTime(batch.sent_at) : 'Дата не указана'}
                                {(batch.file_count || 0) > 0 ? ` · ${batch.file_count} файл(ов)` : ''}
                              </div>
                              {batch.manager_comment && (
                                <div className={s.mutedSmall} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                  {batch.manager_comment}
                                </div>
                              )}
                            </div>
                            {batch.files_url && (
                              <a
                                href={batch.files_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.secondaryBtn}
                                style={{ alignSelf: 'center' }}
                              >
                                <ExternalLink size={12} /> Открыть
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.recent_deliveries && order.recent_deliveries.length > 0 && (
                    <div className={`${s.flexCol} ${s.gap6}`} style={{ marginTop: 10 }}>
                      {order.recent_deliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className={s.card}
                          style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}
                        >
                          <div className={`${s.flexRow} ${s.gap8}`} style={{ alignItems: 'flex-start' }}>
                            <div className={s.flex1}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {delivery.title}
                              </div>
                              <div className={s.mutedSmall}>
                                {delivery.source_label}
                                {delivery.created_at ? ` · ${formatDateTime(delivery.created_at)}` : ''}
                              </div>
                              {delivery.message_text && (
                                <div className={s.mutedSmall} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                  {delivery.message_text}
                                </div>
                              )}
                            </div>
                            {delivery.file_url && (
                              <a
                                href={delivery.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.secondaryBtn}
                                style={{ alignSelf: 'center' }}
                              >
                                <ExternalLink size={12} /> Открыть
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Payment Actions */}
              {isVerification && (
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <button type="button" className={`${s.successBtn} ${s.btnFull}`} disabled={busy}
                    onClick={() => act('Оплата подтверждена', () => confirmGodPayment(order.id))}>
                    <Check size={14} /> Подтвердить
                  </button>
                  <button type="button" className={`${s.dangerBtn} ${s.btnFull}`} disabled={busy}
                    onClick={() => act('Оплата отклонена', () => rejectGodPayment(order.id))}>
                    <X size={14} /> Отклонить
                  </button>
                </div>
              )}

              {/* Status Change */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Статус</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={s.filterSelect} style={{ flex: 1 }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                  <button type="button" className={s.primaryBtn} disabled={busy || newStatus === order.status}
                    onClick={() => act('Статус обновлён', () => updateGodOrderStatus(order.id, newStatus))}>
                    OK
                  </button>
                </div>
              </div>

              {/* Price Change */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Цена</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <input type="number" inputMode="numeric" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                    className={s.input} style={{ flex: 1 }} placeholder="0" />
                  <button type="button" className={s.primaryBtn} disabled={busy || !newPrice}
                    onClick={() => act('Цена обновлена', () => updateGodOrderPrice(order.id, Number(newPrice)))}>
                    OK
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Прогресс: {newProgress}%</div>
                <input type="range" min={0} max={100} value={newProgress} onChange={(e) => setNewProgress(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--gold-400)' }} />
                <button type="button" className={s.secondaryBtn} disabled={busy || newProgress === order.progress}
                  onClick={() => act('Прогресс обновлён', () => updateGodOrderProgress(order.id, newProgress))} style={{ marginTop: 4 }}>
                  Сохранить
                </button>
              </div>

              {/* Notes */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Заметки</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={s.textarea} rows={3} />
                <button type="button" className={s.secondaryBtn} disabled={busy || notes === (order.admin_notes || '')}
                  onClick={() => act('Заметки сохранены', () => updateGodOrderNotes(order.id, notes))} style={{ marginTop: 4 }}>
                  Сохранить
                </button>
              </div>

              {/* Send Message */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Сообщение клиенту</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
                    className={s.input} style={{ flex: 1 }} placeholder="Текст..." />
                  <button type="button" className={s.primaryBtn} disabled={busy || !msgText.trim()}
                    onClick={() => act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText('') })}>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ CHAT TAB ═══════ */}
          {tab === 'chat' && (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {messages.length === 0 ? (
                <div className={s.mutedSmall} style={{ textAlign: 'center', padding: 24 }}>Нет сообщений</div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_type === 'admin'
                  const revisionRound = msg.revision_round_id ? revisionRoundMap.get(msg.revision_round_id) : null
                  return (
                    <div key={msg.id} style={{
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isAdmin ? 'var(--gold-glass-subtle)' : 'var(--bg-glass)',
                      border: `1px solid ${isAdmin ? 'var(--border-gold)' : 'var(--surface-hover)'}`,
                    }}>
                      <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`} style={{ marginBottom: 4 }}>
                        {revisionRound && (
                          <span className={s.tagMuted}>Правка #{revisionRound.round_number}</span>
                        )}
                        {msg.delivery_version_number && (
                          <span className={s.tagGreen}>v{msg.delivery_version_number}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: isAdmin ? 'var(--gold-400)' : 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {msg.message_text || (msg.file_name ? `📎 ${msg.file_name}` : '—')}
                      </div>
                      <div className={s.mutedSmall} style={{ marginTop: 2, textAlign: 'right' }}>
                        {formatDateTime(msg.created_at)}
                      </div>
                    </div>
                  )
                })
              )}
              <div className={`${s.flexRow} ${s.gap6}`} style={{ marginTop: 8 }}>
                <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
                  className={s.input} style={{ flex: 1 }} placeholder="Сообщение..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && msgText.trim()) {
                      act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText(''); await load() })
                    }
                  }}
                />
                <button type="button" className={s.primaryBtn} disabled={busy || !msgText.trim()}
                  onClick={() => act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText(''); await load() })}>
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════ TIMELINE TAB ═══════ */}
          {tab === 'timeline' && (
            <div className={s.timeline}>
              {order.activity_timeline && order.activity_timeline.length > 0 ? (
                order.activity_timeline.map((item) => (
                  <div key={item.id} className={s.timelineItem}>
                    <div className={s.timelineDot} style={{ borderColor: getTimelineDotColor(item.accent) }} />
                    <div className={s.timelineContent}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.title}</div>
                      {item.details && (
                        <div className={s.mutedSmall} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                          {item.details}
                        </div>
                      )}
                      <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ marginTop: 6, alignItems: 'center' }}>
                        {item.timestamp && (
                          <div className={s.timelineTime}>{formatDateTime(item.timestamp)}</div>
                        )}
                        {item.link_url && (
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.secondaryBtn}
                          >
                            <ExternalLink size={12} /> {item.link_label || 'Открыть'}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={s.mutedSmall} style={{ textAlign: 'center', padding: 24 }}>
                  История действий пока пуста
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </BottomSheet>
  )
})

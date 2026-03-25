import { describe, expect, it } from 'vitest'
import type { OrderStatus } from '../types'
import {
  formatOrderDeadlineRu,
  getOrderHeadlineSafe,
  getOrderSublineSafe,
  normalizeOrder,
  normalizeOrders,
} from './orderView'

describe('orderView', () => {
  it('normalizes malformed order payload safely', () => {
    const order = normalizeOrder({
      id: '242' as unknown as number,
      status: 'legacy_status' as unknown as OrderStatus,
      work_type: 'legacy_type',
      work_type_label: '   ',
      subject: 123 as unknown as string,
      topic: null,
      deadline: { invalid: true } as unknown as string,
      created_at: 'not-a-date',
      final_price: null as unknown as number,
      price: '12500.4' as unknown as number,
      paid_amount: '2500' as unknown as number,
      progress: '180' as unknown as number,
      is_archived: 'yes' as unknown as boolean,
    })

    expect(order.id).toBe(242)
    expect(order.status).toBe('pending')
    expect(order.work_type).toBe('other')
    expect(order.work_type_label).toBe('Заказ')
    expect(order.subject).toBe('123')
    expect(order.deadline).toBeNull()
    expect(order.created_at).toBe('1970-01-01T00:00:00.000Z')
    expect(order.final_price).toBeCloseTo(12500.4)
    expect(order.paid_amount).toBe(2500)
    expect(order.progress).toBe(100)
    expect(order.is_archived).toBe(false)
  })

  it('normalizes arrays with null items without throwing', () => {
    const orders = normalizeOrders([
      null,
      undefined,
      { id: 7, status: 'review', work_type: 'coursework', topic: 'Финальная версия' },
    ])

    expect(orders).toHaveLength(3)
    expect(orders[0].id).toBe(1)
    expect(orders[1].id).toBe(2)
    expect(orders[2].status).toBe('review')
    expect(orders[2].work_type_label).toBe('Курсовая')
  })

  it('builds safe headline and subline for sparse orders', () => {
    const order = normalizeOrder({
      id: 17,
      work_type: 'masters',
      work_type_label: 'Магистерская',
      subject: 'Экономика',
      topic: '',
    })

    expect(getOrderHeadlineSafe(order)).toBe('Экономика')
    expect(getOrderSublineSafe(order)).toBe('Магистерская')
  })

  it('preserves paused status and freeze fields from API payload', () => {
    const order = normalizeOrder({
      id: 88,
      status: 'paused',
      work_type: 'coursework',
      pause_until: '2026-04-01T09:30:00Z',
      pause_started_at: '2026-03-25T09:30:00Z',
      pause_reason: 'Жду материалы',
      paused_from_status: 'in_progress',
      pause_days_used: '7' as unknown as number,
      pause_available_days: '0' as unknown as number,
      can_pause: false,
      can_resume: true,
    })

    expect(order.status).toBe('paused')
    expect(order.paused_from_status).toBe('in_progress')
    expect(order.pause_until).toBe('2026-04-01T09:30:00.000Z')
    expect(order.pause_started_at).toBe('2026-03-25T09:30:00.000Z')
    expect(order.pause_reason).toBe('Жду материалы')
    expect(order.pause_days_used).toBe(7)
    expect(order.pause_available_days).toBe(0)
    expect(order.can_pause).toBe(false)
    expect(order.can_resume).toBe(true)
  })

  it('formats common deadline aliases in russian', () => {
    expect(formatOrderDeadlineRu('today')).toBe('Сегодня')
    expect(formatOrderDeadlineRu('week')).toBe('Неделя')
    expect(formatOrderDeadlineRu(null)).toBe('')
  })
})

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, BookOpen } from 'lucide-react'
import { Order } from '../../types'
import { Reveal } from '../ui/StaggerReveal'

const WORK_TYPE_LABELS: Record<string, string> = {
  masters: 'Магистерская',
  diploma: 'Дипломная',
  coursework: 'Курсовая',
  practice: 'Практика',
  essay: 'Эссе',
  presentation: 'Презентация',
  control: 'Контрольная',
  independent: 'Самостоятельная',
  report: 'Реферат',
  photo_task: 'Фото задания',
  other: 'Другое',
}

// Subject families — suggest related subjects
const SUBJECT_FAMILIES: Record<string, string[]> = {
  'Макроэкономика': ['Микроэкономика', 'Экономическая теория', 'Мировая экономика'],
  'Микроэкономика': ['Макроэкономика', 'Институциональная экономика'],
  'Гражданское право': ['Уголовное право', 'Трудовое право', 'Семейное право'],
  'Уголовное право': ['Гражданское право', 'Конституционное право'],
  'Финансовый менеджмент': ['Финансовый анализ', 'Бухгалтерский учёт'],
  'Маркетинг': ['Менеджмент', 'Стратегический маркетинг', 'Digital-маркетинг'],
  'Менеджмент': ['Маркетинг', 'Управление проектами', 'Стратегический менеджмент'],
  'Психология': ['Социальная психология', 'Возрастная психология'],
}

interface SmartReorderCardProps {
  lastOrder: Order
  onReorder: (workType: string, subject?: string) => void
  haptic: (type: 'light' | 'medium' | 'heavy') => void
  cashbackPercent?: number
}

export const SmartReorderCard = memo(function SmartReorderCard({
  lastOrder,
  onReorder,
  haptic,
  cashbackPercent = 0,
}: SmartReorderCardProps) {
  if (lastOrder.status !== 'completed') return null

  const suggestion = useMemo(() => {
    const subject = lastOrder.subject || ''
    const related = Object.entries(SUBJECT_FAMILIES).find(([key]) =>
      subject.toLowerCase().includes(key.toLowerCase())
    )
    if (related) {
      const suggestion = related[1][Math.floor(Math.random() * related[1].length)]
      return {
        subject: suggestion,
        reason: `Дополнит «${lastOrder.subject}»`,
      }
    }
    return null
  }, [lastOrder.subject])

  const workTypeLabel = lastOrder.work_type_label || WORK_TYPE_LABELS[lastOrder.work_type] || lastOrder.work_type

  return (
    <Reveal animation="spring">
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Main reorder */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptic('medium')
            onReorder(lastOrder.work_type, lastOrder.subject || undefined)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BookOpen size={18} color="var(--gold-300)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.55)',
              marginBottom: 3,
            }}>
              {workTypeLabel} · повтор
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {lastOrder.subject || 'Повторить похожий заказ'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                Данные подтянутся
              </span>
              {cashbackPercent > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--success-text)',
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'rgba(52, 211, 153, 0.08)',
                }}>
                  +{cashbackPercent}% кешбэк
                </span>
              )}
            </div>
          </div>

          <ArrowRight size={16} color="var(--gold-400)" style={{ opacity: 0.4, flexShrink: 0 }} />
        </motion.button>

        {/* Smart suggestion */}
        {suggestion && (
          <>
            <div style={{
              margin: '0 16px',
              height: 1,
              background: 'rgba(255,255,255,0.05)',
            }} />

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptic('medium')
                onReorder(lastOrder.work_type, suggestion.subject)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Sparkles size={14} color="rgba(167, 139, 250, 0.6)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(167, 139, 250, 0.9)',
                }}>
                  {suggestion.subject}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {suggestion.reason}
                </div>
              </div>
              <ArrowRight size={12} color="var(--text-muted)" />
            </motion.button>
          </>
        )}
      </div>
    </Reveal>
  )
})

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, RotateCcw, Lightbulb } from 'lucide-react'
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

// Related subject suggestions
const SUBJECT_FAMILIES: Record<string, string[]> = {
  'Макроэкономика': ['Микроэкономика', 'Экономическая теория'],
  'Микроэкономика': ['Макроэкономика', 'Институциональная экономика'],
  'Гражданское право': ['Трудовое право', 'Семейное право'],
  'Уголовное право': ['Гражданское право', 'Конституционное право'],
  'Финансовый менеджмент': ['Финансовый анализ', 'Бухгалтерский учёт'],
  'Маркетинг': ['Менеджмент', 'Digital-маркетинг'],
  'Менеджмент': ['Маркетинг', 'Управление проектами'],
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
  const suggestion = useMemo(() => {
    const subject = lastOrder.subject || ''
    for (const [key, related] of Object.entries(SUBJECT_FAMILIES)) {
      if (subject.toLowerCase().includes(key.toLowerCase())) {
        // Pick a deterministic suggestion based on subject length
        const idx = subject.length % related.length
        return { subject: related[idx], baseSubject: key }
      }
    }
    return null
  }, [lastOrder.subject])

  const workTypeLabel = lastOrder.work_type_label || WORK_TYPE_LABELS[lastOrder.work_type] || lastOrder.work_type

  if (lastOrder.status !== 'completed') return null

  return (
    <Reveal animation="spring">
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 12px -4px rgba(0,0,0,0.2)',
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
            background: 'var(--gold-glass-subtle)',
            border: '1px solid rgba(212,175,55,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <RotateCcw size={17} strokeWidth={2} color="var(--gold-400)" />
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
              {lastOrder.subject || 'Повторить заказ'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                Все данные сохранены
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
                  +{cashbackPercent}%
                </span>
              )}
            </div>
          </div>

          <ArrowRight size={16} strokeWidth={2} color="var(--gold-400)" style={{ opacity: 0.4, flexShrink: 0 }} />
        </motion.button>

        {/* Smart suggestion — only if we have a match */}
        {suggestion && (
          <>
            <div style={{
              margin: '0 16px',
              height: 1,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
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
              <Lightbulb size={14} strokeWidth={2} color="var(--gold-400)" style={{ opacity: 0.6 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-300)' }}>
                  {suggestion.subject}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Смежный предмет к «{suggestion.baseSubject}»
                </div>
              </div>
              <ArrowRight size={12} strokeWidth={2} color="var(--text-muted)" />
            </motion.button>
          </>
        )}
      </div>
    </Reveal>
  )
})

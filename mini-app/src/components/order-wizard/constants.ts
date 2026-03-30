import {
  GraduationCap, FileText, BookOpen, Scroll, PenTool,
  ClipboardCheck, Presentation, Briefcase, Camera,
  HelpCircle
} from 'lucide-react'
import { ServiceType, DeadlineOption } from './types'

// ═══════════════════════════════════════════════════════════════════════════
//  КАТАЛОГ УСЛУГ
//  Легитимные услуги академической поддержки
// ═══════════════════════════════════════════════════════════════════════════

export const SERVICE_TYPES: ServiceType[] = [
  {
    id: 'diploma',
    label: 'Дипломная работа (ВКР)',
    description: 'Сопровождение до оценки',
    price: 'от 40 000 ₽',
    priceNum: 40000,
    icon: GraduationCap,
    category: 'premium',
    duration: 'от 21 дня',
    popular: true,
  },
  {
    id: 'masters',
    label: 'Магистерская диссертация',
    description: 'До защиты с научной новизной',
    price: 'от 60 000 ₽',
    priceNum: 60000,
    icon: GraduationCap,
    category: 'premium',
    duration: 'от 30 дней',
    popular: false,
  },
  {
    id: 'coursework',
    label: 'Курсовая работа',
    description: 'По требованиям ВУЗа и кафедры',
    price: 'от 14 000 ₽',
    priceNum: 14000,
    icon: BookOpen,
    category: 'standard',
    duration: 'от 7 дней',
    popular: true,
  },
  {
    id: 'practice',
    label: 'Отчёт по практике',
    description: 'Дневник + отчёт под ключ',
    price: 'от 8 000 ₽',
    priceNum: 8000,
    icon: Briefcase,
    category: 'standard',
    duration: 'от 5 дней',
  },
  {
    id: 'presentation',
    label: 'Презентация',
    description: 'Слайды + речь к выступлению',
    price: 'от 7 000 ₽',
    priceNum: 7000,
    icon: Presentation,
    category: 'standard',
    duration: 'от 2 дней',
    popular: true,
  },
  {
    id: 'essay',
    label: 'Эссе',
    description: 'Аргументированно и по делу',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: PenTool,
    category: 'express',
    duration: 'от 2 дней',
  },
  {
    id: 'report',
    label: 'Реферат',
    description: 'По ГОСТу, с источниками',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: FileText,
    category: 'express',
    duration: 'от 2 дней',
  },
  {
    id: 'control',
    label: 'Контрольная работа',
    description: 'С ходом решения и оформлением',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: ClipboardCheck,
    category: 'express',
    duration: 'от 1 дня',
  },
  {
    id: 'independent',
    label: 'Самостоятельная работа',
    description: 'По методичке преподавателя',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: Scroll,
    category: 'express',
    duration: 'от 1 дня',
  },
  {
    id: 'photo_task',
    label: 'Задача по фото',
    description: 'Фото задания — решение в ответ',
    price: 'индивидуально',
    priceNum: 0,
    icon: Camera,
    category: 'express',
    duration: 'от 1 дня',
  },
  {
    id: 'other',
    label: 'Другое',
    description: 'Опишите задачу — подберём формат',
    price: 'индивидуально',
    priceNum: 0,
    icon: HelpCircle,
    category: 'express',
    duration: 'обсудим сроки',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  СРОКИ ВЫПОЛНЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════

export const DEADLINES: DeadlineOption[] = [
  { value: 'today', label: 'Сегодня', multiplier: '+100%', multiplierNum: 2.0, urgency: 100, color: '#ef4444' },
  { value: 'tomorrow', label: 'Завтра', multiplier: '+70%', multiplierNum: 1.7, urgency: 85, color: '#f97316' },
  { value: '3days', label: '2-3 дня', multiplier: '+40%', multiplierNum: 1.4, urgency: 60, color: '#eab308' },
  { value: 'week', label: 'Неделя', multiplier: '+20%', multiplierNum: 1.2, urgency: 40, color: '#84cc16' },
  { value: '2weeks', label: '2 недели', multiplier: '+10%', multiplierNum: 1.1, urgency: 20, color: '#22c55e' },
  { value: 'month', label: 'Месяц+', multiplier: 'Базовая', multiplierNum: 1.0, urgency: 5, color: '#10b981' },
]

// ═══════════════════════════════════════════════════════════════════════════
//  ШАБЛОНЫ ТРЕБОВАНИЙ (по типам услуг)
// ═══════════════════════════════════════════════════════════════════════════

export const REQUIREMENTS_TEMPLATES: Record<string, string> = {
  diploma: `Объём — 60-80 страниц
Уникальность — от 70%
Оформление по ГОСТу
Введение, 3 главы, заключение
Источники — от 40`,

  masters: `Объём — 80-100 страниц
Уникальность — от 75%
Научная новизна обязательна
Практическая часть с расчётами`,

  coursework: `Объём — 25-35 страниц
Уникальность — от 60%
Оформление по методичке`,

  presentation: `15-20 слайдов
Деловой стиль
Речь к каждому слайду`,

  default: `Опишите ваши требования в свободной форме`,
}

// ═══════════════════════════════════════════════════════════════════════════
//  WIZARD STEP CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const WIZARD_STEPS = [
  { num: 1, title: 'Услуга', subtitle: 'Что нужно сделать?' },
  { num: 2, title: 'Детали', subtitle: 'Предмет и требования' },
  { num: 3, title: 'Сроки', subtitle: 'Когда нужно сдать?' },
]

// Storage keys
export const DRAFT_KEY = 'order_draft_v2'
export const DRAFTS_BY_TYPE_KEY = 'order_drafts_by_type_v1'

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
    id: 'masters',
    label: 'Магистерская диссертация',
    description: 'Доведём до защиты. Научная новизна есть',
    price: 'от 60 000 ₽',
    priceNum: 60000,
    icon: GraduationCap,
    category: 'premium',
    duration: '30-60 дней',
    popular: false,
  },
  {
    id: 'diploma',
    label: 'Дипломная работа (ВКР)',
    description: 'Ведём до оценки, а не просто до сдачи',
    price: 'от 40 000 ₽',
    priceNum: 40000,
    icon: GraduationCap,
    category: 'premium',
    duration: '21-45 дней',
    popular: true,
  },
  {
    id: 'coursework',
    label: 'Курсовая работа',
    description: 'Под требования вашего ВУЗа и кафедры',
    price: 'от 14 000 ₽',
    priceNum: 14000,
    icon: BookOpen,
    category: 'standard',
    duration: '7-14 дней',
    popular: true,
  },
  {
    id: 'practice',
    label: 'Отчёт по практике',
    description: 'Дневник + отчёт. Открыл и сдал',
    price: 'от 8 000 ₽',
    priceNum: 8000,
    icon: Briefcase,
    category: 'standard',
    duration: '5-10 дней',
  },
  {
    id: 'essay',
    label: 'Эссе',
    description: 'Аргументы вместо воды. Сдашь сразу',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: PenTool,
    category: 'express',
    duration: '2-5 дней',
  },
  {
    id: 'presentation',
    label: 'Презентация',
    description: 'Слайды + речь. Выступишь уверенно',
    price: 'от 7 000 ₽',
    priceNum: 7000,
    icon: Presentation,
    category: 'express',
    duration: '2-4 дня',
    popular: true,
  },
  {
    id: 'control',
    label: 'Контрольная работа',
    description: 'Всё решено и оформлено по методичке',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: ClipboardCheck,
    category: 'express',
    duration: '1-3 дня',
  },
  {
    id: 'independent',
    label: 'Самостоятельная работа',
    description: 'По методичке вашего преподавателя',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: Scroll,
    category: 'express',
    duration: '1-3 дня',
  },
  {
    id: 'report',
    label: 'Реферат',
    description: 'Оформлен по ГОСТу. Бери и сдавай',
    price: 'от 2 500 ₽',
    priceNum: 2500,
    icon: FileText,
    category: 'express',
    duration: '2-5 дней',
  },
  {
    id: 'photo_task',
    label: 'Задача по фото',
    description: 'Фото задания — решение в ответ',
    price: 'индивидуально',
    priceNum: 0,
    icon: Camera,
    category: 'express',
    duration: '1-2 дня',
  },
  {
    id: 'other',
    label: 'Другое',
    description: 'Опишите задачу — подберём автора',
    price: 'индивидуально',
    priceNum: 0,
    icon: HelpCircle,
    category: 'express',
    duration: 'по договорённости',
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
  diploma: `• Объём: ___ страниц
• Уникальность: ___%
• Оформление: ГОСТ / методичка ВУЗа
• Структура: введение, 3 главы, заключение
• Количество источников: ___
• Особые требования:`,

  masters: `• Объём: ___ страниц
• Уникальность: ___%
• Научная новизна: требуется / не требуется
• Практическая часть: есть / нет
• Особые требования:`,

  coursework: `• Объём: ___ страниц
• Уникальность: ___%
• Оформление: ГОСТ / методичка
• Особые требования:`,

  presentation: `• Количество слайдов: ___
• Стиль: деловой / креативный / академический
• Анимации: да / нет
• Особые требования:`,

  default: `• Объём работы:
• Требования к оформлению:
• Дополнительные пожелания:`,
}

// ═══════════════════════════════════════════════════════════════════════════
//  WIZARD STEP CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const WIZARD_STEPS = [
  { num: 1, title: 'Выберите услугу', subtitle: 'Что нужно сделать?' },
  { num: 2, title: 'Контекст заказа', subtitle: 'Предмет, требования и файлы' },
  { num: 3, title: 'Сроки', subtitle: 'Выберите комфортный темп' },
]

// Storage keys
export const DRAFT_KEY = 'order_draft_v2'
export const DRAFTS_BY_TYPE_KEY = 'order_drafts_by_type_v1'

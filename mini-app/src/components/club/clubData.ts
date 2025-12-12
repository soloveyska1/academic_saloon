import { ClubLevel, Reward, Mission } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB LEVELS - Silver → Gold → Platinum
// ═══════════════════════════════════════════════════════════════════════════════

export const CLUB_LEVELS: Record<string, ClubLevel> = {
  silver: {
    id: 'silver',
    name: 'Silver',
    emoji: '🥈',
    perks: [
      'Ежедневный бонус баллов',
      'Доступ к базовым шаблонам',
      'Приоритетная оценка (до 2ч)',
    ],
    minXp: 0,
    nextLevelXp: 500,
    accentColor: '#A0A0A0',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    emoji: '🥇',
    perks: [
      'Все привилегии Silver',
      'Увеличенный ежедневный бонус (+50%)',
      'Премиум шаблоны оформления',
      'Приоритет в очереди',
      'Персональный менеджер в чате',
    ],
    minXp: 500,
    nextLevelXp: 1500,
    accentColor: '#D4AF37',
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    emoji: '💎',
    perks: [
      'Все привилегии Gold',
      'Максимальный ежедневный бонус (+100%)',
      'Эксклюзивные шаблоны',
      'VIP поддержка 24/7',
      'Бесплатная проверка на оригинальность',
      'Ранний доступ к новым услугам',
    ],
    minXp: 1500,
    nextLevelXp: null,
    accentColor: '#B9F2FF',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AVAILABLE REWARDS - Store catalog
// ═══════════════════════════════════════════════════════════════════════════════

export const AVAILABLE_REWARDS: Reward[] = [
  // FREE (0₽ cost) rewards
  {
    id: 'template-basic',
    title: 'Шаблон оформления',
    description: 'Готовый шаблон по ГОСТ для курсовых и дипломных',
    costPoints: 50,
    category: 'free',
    icon: 'FileText',
    constraints: {
      validDays: 30,
      stackable: true,
    },
  },
  {
    id: 'checklist-defense',
    title: 'Чек-лист защиты',
    description: 'Пошаговая подготовка к защите работы',
    costPoints: 30,
    category: 'free',
    icon: 'CheckSquare',
    constraints: {
      validDays: 60,
      stackable: true,
    },
  },
  {
    id: 'badge-early-adopter',
    title: 'Бейдж "Ранний участник"',
    description: 'Эксклюзивный бейдж в профиле',
    costPoints: 100,
    category: 'free',
    icon: 'Award',
    constraints: {
      validDays: 365,
      stackable: false,
      usageLimit: 1,
    },
  },

  // SPEED rewards
  {
    id: 'priority-queue',
    title: 'Приоритет в очереди',
    description: 'Ваш заказ будет обработан первым',
    costPoints: 80,
    category: 'speed',
    icon: 'Zap',
    constraints: {
      validDays: 14,
      stackable: false,
    },
  },
  {
    id: 'fast-estimation',
    title: 'Быстрая оценка',
    description: 'Оценка стоимости за 1 час',
    costPoints: 60,
    category: 'speed',
    icon: 'Clock',
    constraints: {
      validDays: 7,
      stackable: false,
    },
  },
  {
    id: 'express-support',
    title: 'Экспресс-консультация',
    description: 'Ответ от специалиста в течение 30 минут',
    costPoints: 120,
    category: 'speed',
    icon: 'MessageCircle',
    constraints: {
      validDays: 7,
      stackable: false,
    },
  },

  // DESIGN rewards
  {
    id: 'premium-design',
    title: 'Премиум оформление',
    description: 'Улучшенное визуальное оформление работы',
    costPoints: 150,
    category: 'design',
    icon: 'Palette',
    constraints: {
      validDays: 30,
      stackable: false,
    },
  },
  {
    id: 'infographics',
    title: 'Инфографика',
    description: '1 схема или диаграмма для работы',
    costPoints: 100,
    category: 'design',
    icon: 'PieChart',
    constraints: {
      validDays: 30,
      stackable: true,
    },
  },
  {
    id: 'presentation-template',
    title: 'Шаблон презентации',
    description: 'Готовый шаблон для защиты',
    costPoints: 80,
    category: 'design',
    icon: 'Presentation',
    constraints: {
      validDays: 60,
      stackable: true,
    },
  },

  // DISCOUNT rewards (controlled)
  {
    id: 'discount-5-options',
    title: '5% на опции',
    description: 'Скидка на дополнительные услуги',
    costPoints: 200,
    category: 'discount',
    icon: 'Percent',
    constraints: {
      validDays: 14,
      stackable: false,
      maxDiscountPercent: 5,
    },
  },
  {
    id: 'discount-10-large',
    title: '10% от 5000₽',
    description: 'Скидка на заказ от 5000₽',
    costPoints: 400,
    category: 'discount',
    icon: 'Tag',
    constraints: {
      minOrderAmount: 5000,
      validDays: 14,
      stackable: false,
      maxDiscountPercent: 10,
    },
  },
  {
    id: 'free-revision',
    title: 'Бесплатная доработка',
    description: '+1 бесплатная доработка к заказу',
    costPoints: 250,
    category: 'discount',
    icon: 'RefreshCw',
    constraints: {
      validDays: 30,
      stackable: false,
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  DAILY MISSIONS - Examples
// ═══════════════════════════════════════════════════════════════════════════════

export const MOCK_MISSIONS: Mission[] = [
  {
    id: 'mission-requirements',
    title: 'Уточнить требования',
    description: 'Добавьте методичку или требования к заказу',
    rewardPoints: 15,
    status: 'pending',
    deepLinkTarget: '/create-order?step=details',
    icon: 'FileText',
  },
  {
    id: 'mission-deadline',
    title: 'Указать сроки',
    description: 'Установите точный срок сдачи работы',
    rewardPoints: 10,
    status: 'pending',
    deepLinkTarget: '/create-order?step=deadline',
    icon: 'Calendar',
  },
  {
    id: 'mission-profile',
    title: 'Заполнить профиль',
    description: 'Укажите ваш учебный профиль',
    rewardPoints: 20,
    status: 'completed',
    deepLinkTarget: '/profile',
    icon: 'User',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  DAILY BONUS REWARDS - 7-day cycle (predictable)
// ═══════════════════════════════════════════════════════════════════════════════

export const DAILY_BONUS_CYCLE = [
  { day: 1, points: 10, label: 'День 1' },
  { day: 2, points: 15, label: 'День 2' },
  { day: 3, points: 20, label: 'День 3' },
  { day: 4, points: 25, label: 'День 4' },
  { day: 5, points: 30, label: 'День 5' },
  { day: 6, points: 40, label: 'День 6' },
  { day: 7, points: 50, label: 'День 7', bonus: true },
]

// Level multipliers for daily bonus
export const LEVEL_BONUS_MULTIPLIER: Record<string, number> = {
  silver: 1.0,
  gold: 1.5,
  platinum: 2.0,
}

export type SupportLinkTone = 'vk' | 'max' | 'telegram' | 'bot' | 'email' | 'site' | 'legal'

export interface SupportLink {
  key: string
  eyebrow: string
  title: string
  description: string
  href: string
  actionLabel: string
  meta: string
  badge: string
  tone: SupportLinkTone
}

export interface SupportFaqItem {
  key: string
  question: string
  answer: string
}

export const LEGAL_DOCUMENTS_URL = 'https://telegra.ph/Pravovye-dokumenty-servisa-Akademicheskij-Salon-03-26-2'

const OWNER_VK: SupportLink = {
  key: 'owner-vk',
  eyebrow: 'Личный контакт',
  title: 'Личный VK',
  description: 'Для срочных вопросов и обсуждения работы.',
  href: 'https://vk.com/imsaay',
  actionLabel: 'Написать в VK',
  meta: 'vk.com/imsaay',
  badge: 'VK',
  tone: 'vk',
}

const MAX_SALON: SupportLink = {
  key: 'max-salon',
  eyebrow: 'Основной канал',
  title: 'Академический Салон в MAX',
  description: 'Основной канал в MAX для переписки и файлов.',
  href: 'https://max.ru/join/dP7MynBoq0tumYpQIc5e5UYtt_F9ZGElLsRetoIHZPs',
  actionLabel: 'Открыть в MAX',
  meta: 'max.ru',
  badge: 'MAX',
  tone: 'max',
}

const MAX_GIPSR: SupportLink = {
  key: 'max-gipsr',
  eyebrow: 'Отдельная подборка',
  title: 'Кладовая ГИПСР в MAX',
  description: 'Отдельный раздел с материалами по теме ГИПСР.',
  href: 'https://max.ru/join/lvaRhM9GTze3JfqgW9GsTisLfz-o_IOdVK-ev-_AsH0',
  actionLabel: 'Перейти в MAX',
  meta: 'max.ru',
  badge: 'MAX',
  tone: 'max',
}

const TELEGRAM_MANAGER: SupportLink = {
  key: 'manager-telegram',
  eyebrow: 'Telegram',
  title: 'Менеджер в Telegram',
  description: 'Если удобнее Telegram, можно написать сюда.',
  href: 'https://t.me/academicsaloon',
  actionLabel: 'Открыть Telegram',
  meta: '@academicsaloon',
  badge: 'TG',
  tone: 'telegram',
}

const TELEGRAM_BOT: SupportLink = {
  key: 'telegram-bot',
  eyebrow: 'Бот для заказа',
  title: 'Бот Академического Салона',
  description: 'Бот для новой заявки.',
  href: 'https://t.me/Kladovaya_GIPSR_bot',
  actionLabel: 'Открыть бота',
  meta: '@Kladovaya_GIPSR_bot',
  badge: 'BOT',
  tone: 'bot',
}

const EMAIL_SUPPORT: SupportLink = {
  key: 'email',
  eyebrow: 'Почта',
  title: 'Почта Академического Салона',
  description: 'Для писем, файлов и официальных запросов.',
  href: 'mailto:academsaloon@mail.ru',
  actionLabel: 'Написать письмо',
  meta: 'academsaloon@mail.ru',
  badge: 'MAIL',
  tone: 'email',
}

export const SITE_SUPPORT: SupportLink = {
  key: 'site',
  eyebrow: 'Полная версия',
  title: 'bibliosaloon.ru',
  description: 'Полная версия сайта. Её удобнее открыть с ноутбука.',
  href: 'https://bibliosaloon.ru',
  actionLabel: 'Открыть полную версию',
  meta: 'Лучше на десктопе',
  badge: 'WEB',
  tone: 'site',
}

const LEGAL_SUPPORT: SupportLink = {
  key: 'legal',
  eyebrow: 'Правовой контур',
  title: 'Правовые документы',
  description: 'Условия сервиса и правовые документы.',
  href: LEGAL_DOCUMENTS_URL,
  actionLabel: 'Открыть документы',
  meta: 'telegra.ph',
  badge: 'DOC',
  tone: 'legal',
}

export const PRIMARY_SUPPORT_LINKS: SupportLink[] = [OWNER_VK, MAX_SALON, MAX_GIPSR]
export const TELEGRAM_SUPPORT_LINKS: SupportLink[] = [TELEGRAM_MANAGER, TELEGRAM_BOT]
export const OFFICIAL_LINKS: SupportLink[] = [EMAIL_SUPPORT, LEGAL_SUPPORT]

export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    key: 'use-as-example',
    question: 'Можно ли использовать материал как готовую сдачу?',
    answer:
      'Лучше взять материал как ориентир: структура, подача и оформление. Затем подстроить под свою тему.',
  },
  {
    key: 'similar-topic',
    question: 'Что делать, если тема похожая, но не совпадает полностью?',
    answer:
      'Открой ближайший материал и при необходимости нажми «Заказать похожую». Так легче показать нужное направление.',
  },
  {
    key: 'find-faster',
    question: 'Как найти нужный файл?',
    answer:
      'Ищи по теме, предмету или типу работы. Если вариантов несколько, сохрани их в избранное и сравни позже.',
  },
  {
    key: 'file-help',
    question: 'Что делать, если файл не открылся или нужен другой вариант?',
    answer:
      'Напиши в личный VK или MAX и пришли название документа. Подберём похожий вариант.',
  },
]

export const DIRECT_SUPPORT_LINKS: SupportLink[] = [OWNER_VK, EMAIL_SUPPORT, TELEGRAM_MANAGER, TELEGRAM_BOT]
export const COMMUNITY_LINKS: SupportLink[] = [MAX_SALON, MAX_GIPSR]
export const SUPPORT_LINKS: SupportLink[] = [
  OWNER_VK,
  MAX_SALON,
  MAX_GIPSR,
  TELEGRAM_MANAGER,
  TELEGRAM_BOT,
  EMAIL_SUPPORT,
  LEGAL_SUPPORT,
  SITE_SUPPORT,
]

export function getSupportLink(key: string): SupportLink {
  const item = SUPPORT_LINKS.find((entry) => entry.key === key)
  if (!item) {
    throw new Error(`Unknown support link: ${key}`)
  }
  return item
}

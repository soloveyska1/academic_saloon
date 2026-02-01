import { Star, TrendingUp, Crown, Gem, LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  ЕДИНЫЙ ИСТОЧНИК ДАННЫХ О РАНГАХ
// ═══════════════════════════════════════════════════════════════════════════

export interface RankData {
  id: string
  name: string
  displayName: string // Для отображения в UI
  cashback: number
  minSpent: number
  icon: LucideIcon
  color: string
  gradient: string
}

export const RANKS: RankData[] = [
  {
    id: 'resident',
    name: 'Салага',
    displayName: 'Резидент',
    cashback: 3,
    minSpent: 0,
    icon: Star,
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)'
  },
  {
    id: 'partner',
    name: 'Ковбой',
    displayName: 'Партнёр',
    cashback: 5,
    minSpent: 5000,
    icon: TrendingUp,
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%)'
  },
  {
    id: 'vip',
    name: 'Головорез',
    displayName: 'VIP-Клиент',
    cashback: 7,
    minSpent: 15000,
    icon: Crown,
    color: '#c084fc',
    gradient: 'linear-gradient(135deg, #e9d5ff 0%, #c084fc 100%)'
  },
  {
    id: 'premium',
    name: 'Легенда Запада',
    displayName: 'Премиум',
    cashback: 10,
    minSpent: 50000,
    icon: Gem,
    color: '#D4AF37',
    gradient: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 100%)'
  }
]

// ═══════════════════════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Найти ранг по проценту кешбэка
 */
export function getRankByCashback(cashback: number): RankData | undefined {
  return RANKS.find(r => r.cashback === cashback)
}

/**
 * Найти индекс ранга по кешбэку
 */
export function getRankIndexByCashback(cashback: number): number {
  return RANKS.findIndex(r => r.cashback === cashback)
}

/**
 * Найти ранг по внутреннему имени (из backend)
 */
export function getRankByName(name: string): RankData | undefined {
  return RANKS.find(r => r.name === name)
}

/**
 * Получить отображаемое имя ранга
 */
export function getDisplayName(backendName: string): string {
  const rank = getRankByName(backendName)
  return rank?.displayName || backendName
}

/**
 * Проверить, заблокирован ли ранг для пользователя
 */
export function isRankLocked(rankIndex: number, userRankIndex: number): boolean {
  return rankIndex > userRankIndex
}

/**
 * Получить следующий ранг
 */
export function getNextRank(currentCashback: number): RankData | null {
  const currentIndex = getRankIndexByCashback(currentCashback)
  if (currentIndex === -1 || currentIndex >= RANKS.length - 1) return null
  return RANKS[currentIndex + 1]
}

/**
 * Проверить, максимальный ли это ранг
 */
export function isMaxRank(cashback: number): boolean {
  const index = getRankIndexByCashback(cashback)
  return index === RANKS.length - 1
}

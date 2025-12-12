import { useState, useEffect, useCallback, useMemo } from 'react'
import { Voucher, VoucherStatus, Reward, ClubHistoryEntry, DailyBonusState, Mission } from '../types'
import { AVAILABLE_REWARDS, DAILY_BONUS_CYCLE, MOCK_MISSIONS } from '../components/club/clubData'

// ═══════════════════════════════════════════════════════════════════════════════
//  useClubState - Полноценное управление Клубом Привилегий
//  Хранение в localStorage с валидацией и синхронизацией
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'academic_saloon_club_state'

interface ClubState {
  points: number
  xp: number
  level: 'silver' | 'gold' | 'platinum'
  vouchers: Voucher[]
  history: ClubHistoryEntry[]
  dailyBonus: DailyBonusState
  missions: Mission[]
  lastUpdated: string
}

const getDefaultState = (): ClubState => ({
  points: 150, // Стартовые баллы для новых пользователей
  xp: 0,
  level: 'silver',
  vouchers: [],
  history: [
    {
      id: 'welcome-bonus',
      type: 'bonus_claim',
      title: 'Приветственный бонус',
      points: 150,
      timestamp: new Date().toISOString(),
    }
  ],
  dailyBonus: {
    status: 'available',
    nextClaimAt: null,
    streakDay: 1,
    weekRewards: DAILY_BONUS_CYCLE.map(d => d.points),
  },
  missions: MOCK_MISSIONS,
  lastUpdated: new Date().toISOString(),
})

// Проверка истёкших ваучеров
function checkExpiredVouchers(vouchers: Voucher[]): Voucher[] {
  const now = new Date()
  return vouchers.map(v => {
    if (v.status === 'active' && new Date(v.expiresAt) < now) {
      return { ...v, status: 'expired' as VoucherStatus }
    }
    return v
  })
}

// Проверка доступности ежедневного бонуса
function checkDailyBonusAvailability(dailyBonus: DailyBonusState): DailyBonusState {
  if (dailyBonus.status === 'cooldown' && dailyBonus.nextClaimAt) {
    const nextClaim = new Date(dailyBonus.nextClaimAt)
    if (new Date() >= nextClaim) {
      return {
        ...dailyBonus,
        status: 'available',
        nextClaimAt: null,
      }
    }
  }
  return dailyBonus
}

// Расчёт уровня по XP
function calculateLevel(xp: number): 'silver' | 'gold' | 'platinum' {
  if (xp >= 1500) return 'platinum'
  if (xp >= 500) return 'gold'
  return 'silver'
}

// Генерация ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useClubState(userId?: number) {
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY

  // Инициализация состояния
  const [state, setState] = useState<ClubState>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as ClubState
        // Валидация и обновление
        return {
          ...parsed,
          vouchers: checkExpiredVouchers(parsed.vouchers || []),
          dailyBonus: checkDailyBonusAvailability(parsed.dailyBonus || getDefaultState().dailyBonus),
          level: calculateLevel(parsed.xp || 0),
        }
      }
    } catch (e) {
      console.error('[useClubState] Ошибка загрузки состояния:', e)
    }
    return getDefaultState()
  })

  // Сохранение в localStorage при изменениях
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...state,
        lastUpdated: new Date().toISOString(),
      }))
    } catch (e) {
      console.error('[useClubState] Ошибка сохранения:', e)
    }
  }, [state, storageKey])

  // Периодическая проверка истёкших ваучеров
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        vouchers: checkExpiredVouchers(prev.vouchers),
        dailyBonus: checkDailyBonusAvailability(prev.dailyBonus),
      }))
    }, 60000) // Каждую минуту

    return () => clearInterval(interval)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  //  БАЛЛЫ
  // ═══════════════════════════════════════════════════════════════════════════

  const addPoints = useCallback((amount: number, reason: string, type: ClubHistoryEntry['type'] = 'bonus_claim') => {
    setState(prev => {
      const newHistory: ClubHistoryEntry = {
        id: generateId(),
        type,
        title: reason,
        points: amount,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        points: prev.points + amount,
        history: [newHistory, ...prev.history].slice(0, 100), // Храним последние 100 записей
      }
    })
  }, [])

  const spendPoints = useCallback((amount: number, reason: string): boolean => {
    if (state.points < amount) {
      return false
    }

    setState(prev => {
      const newHistory: ClubHistoryEntry = {
        id: generateId(),
        type: 'reward_exchange',
        title: reason,
        points: -amount,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        points: prev.points - amount,
        history: [newHistory, ...prev.history].slice(0, 100),
      }
    })

    return true
  }, [state.points])

  // ═══════════════════════════════════════════════════════════════════════════
  //  XP И УРОВНИ
  // ═══════════════════════════════════════════════════════════════════════════

  const addXp = useCallback((amount: number, reason?: string) => {
    setState(prev => {
      const newXp = prev.xp + amount
      const newLevel = calculateLevel(newXp)
      const levelChanged = newLevel !== prev.level

      let history = prev.history
      if (levelChanged) {
        const levelUpEntry: ClubHistoryEntry = {
          id: generateId(),
          type: 'xp_gain',
          title: `Повышение до уровня ${newLevel === 'gold' ? 'Золото' : 'Платина'}!`,
          points: 0,
          timestamp: new Date().toISOString(),
        }
        history = [levelUpEntry, ...history]
      }

      if (reason) {
        const xpEntry: ClubHistoryEntry = {
          id: generateId(),
          type: 'xp_gain',
          title: reason,
          points: amount,
          timestamp: new Date().toISOString(),
        }
        history = [xpEntry, ...history]
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        history: history.slice(0, 100),
      }
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  //  ВАУЧЕРЫ
  // ═══════════════════════════════════════════════════════════════════════════

  const redeemReward = useCallback((reward: Reward): { success: boolean; message: string; voucher?: Voucher } => {
    // Проверка баланса
    if (state.points < reward.costPoints) {
      return {
        success: false,
        message: `Недостаточно баллов. Нужно: ${reward.costPoints}, у вас: ${state.points}`,
      }
    }

    // Проверка лимита использования
    if (reward.constraints.usageLimit) {
      const existingCount = state.vouchers.filter(
        v => v.rewardId === reward.id && (v.status === 'active' || v.status === 'used')
      ).length
      if (existingCount >= reward.constraints.usageLimit) {
        return {
          success: false,
          message: 'Вы уже получили максимальное количество этих наград',
        }
      }
    }

    // Создание ваучера
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + reward.constraints.validDays)

    const newVoucher: Voucher = {
      id: generateId(),
      rewardId: reward.id,
      title: reward.title,
      description: reward.description,
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      applyRules: buildApplyRules(reward),
    }

    setState(prev => {
      const historyEntry: ClubHistoryEntry = {
        id: generateId(),
        type: 'reward_exchange',
        title: `Обмен: ${reward.title}`,
        points: -reward.costPoints,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        points: prev.points - reward.costPoints,
        vouchers: [newVoucher, ...prev.vouchers],
        history: [historyEntry, ...prev.history].slice(0, 100),
      }
    })

    return {
      success: true,
      message: 'Ваучер успешно получен!',
      voucher: newVoucher,
    }
  }, [state.points, state.vouchers])

  const useVoucher = useCallback((voucherId: string, orderId?: number): { success: boolean; message: string } => {
    const voucher = state.vouchers.find(v => v.id === voucherId)

    if (!voucher) {
      return { success: false, message: 'Ваучер не найден' }
    }

    if (voucher.status !== 'active') {
      return { success: false, message: voucher.status === 'used' ? 'Ваучер уже использован' : 'Срок действия ваучера истёк' }
    }

    if (new Date(voucher.expiresAt) < new Date()) {
      return { success: false, message: 'Срок действия ваучера истёк' }
    }

    setState(prev => {
      const orderInfo = orderId ? ` к заказу #${orderId}` : ''
      const historyEntry: ClubHistoryEntry = {
        id: generateId(),
        type: 'voucher_use',
        title: `Использован${orderInfo}: ${voucher.title}`,
        points: 0,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        vouchers: prev.vouchers.map(v =>
          v.id === voucherId ? { ...v, status: 'used' as VoucherStatus } : v
        ),
        history: [historyEntry, ...prev.history].slice(0, 100),
      }
    })

    return { success: true, message: 'Ваучер применён!' }
  }, [state.vouchers])

  // ═══════════════════════════════════════════════════════════════════════════
  //  ЕЖЕДНЕВНЫЙ БОНУС
  // ═══════════════════════════════════════════════════════════════════════════

  const claimDailyBonus = useCallback((): { success: boolean; points: number; message: string } => {
    const { dailyBonus, level } = state

    if (dailyBonus.status !== 'available') {
      if (dailyBonus.nextClaimAt) {
        const remaining = new Date(dailyBonus.nextClaimAt).getTime() - Date.now()
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        return {
          success: false,
          points: 0,
          message: `Следующий бонус через ${hours}ч ${minutes}мин`,
        }
      }
      return { success: false, points: 0, message: 'Бонус пока недоступен' }
    }

    // Рассчитываем баллы с учётом уровня
    const basePoints = DAILY_BONUS_CYCLE[dailyBonus.streakDay - 1]?.points || 10
    const multiplier = level === 'platinum' ? 2.0 : level === 'gold' ? 1.5 : 1.0
    const finalPoints = Math.round(basePoints * multiplier)

    // Следующий день стрика
    const nextStreakDay = dailyBonus.streakDay >= 7 ? 1 : dailyBonus.streakDay + 1

    // Следующее время получения (через 24 часа)
    const nextClaimAt = new Date()
    nextClaimAt.setHours(nextClaimAt.getHours() + 24)

    setState(prev => {
      const historyEntry: ClubHistoryEntry = {
        id: generateId(),
        type: 'bonus_claim',
        title: `Ежедневный бонус (День ${dailyBonus.streakDay})`,
        points: finalPoints,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        points: prev.points + finalPoints,
        xp: prev.xp + 5, // +5 XP за ежедневный вход
        dailyBonus: {
          ...prev.dailyBonus,
          status: 'cooldown',
          nextClaimAt: nextClaimAt.toISOString(),
          streakDay: nextStreakDay,
        },
        history: [historyEntry, ...prev.history].slice(0, 100),
      }
    })

    return {
      success: true,
      points: finalPoints,
      message: dailyBonus.streakDay === 7
        ? `Недельный бонус! +${finalPoints} баллов 🎉`
        : `+${finalPoints} баллов!`,
    }
  }, [state])

  // ═══════════════════════════════════════════════════════════════════════════
  //  МИССИИ
  // ═══════════════════════════════════════════════════════════════════════════

  const completeMission = useCallback((missionId: string): { success: boolean; points: number; message: string } => {
    const mission = state.missions.find(m => m.id === missionId)

    if (!mission) {
      return { success: false, points: 0, message: 'Миссия не найдена' }
    }

    if (mission.status === 'completed') {
      return { success: false, points: 0, message: 'Миссия уже выполнена' }
    }

    setState(prev => {
      const historyEntry: ClubHistoryEntry = {
        id: generateId(),
        type: 'mission_complete',
        title: `Миссия: ${mission.title}`,
        points: mission.rewardPoints,
        timestamp: new Date().toISOString(),
      }

      return {
        ...prev,
        points: prev.points + mission.rewardPoints,
        xp: prev.xp + 10, // +10 XP за миссию
        missions: prev.missions.map(m =>
          m.id === missionId ? { ...m, status: 'completed' as const } : m
        ),
        history: [historyEntry, ...prev.history].slice(0, 100),
      }
    })

    return {
      success: true,
      points: mission.rewardPoints,
      message: `Миссия выполнена! +${mission.rewardPoints} баллов`,
    }
  }, [state.missions])

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const activeVouchers = useMemo(() =>
    state.vouchers.filter(v => v.status === 'active'),
    [state.vouchers]
  )

  const usedVouchers = useMemo(() =>
    state.vouchers.filter(v => v.status === 'used'),
    [state.vouchers]
  )

  const expiredVouchers = useMemo(() =>
    state.vouchers.filter(v => v.status === 'expired'),
    [state.vouchers]
  )

  const pendingMissions = useMemo(() =>
    state.missions.filter(m => m.status === 'pending'),
    [state.missions]
  )

  const completedMissions = useMemo(() =>
    state.missions.filter(m => m.status === 'completed'),
    [state.missions]
  )

  const levelProgress = useMemo(() => {
    const { xp, level } = state
    if (level === 'platinum') return 100
    const thresholds = { silver: { min: 0, max: 500 }, gold: { min: 500, max: 1500 } }
    const { min, max } = thresholds[level]
    return Math.round(((xp - min) / (max - min)) * 100)
  }, [state])

  // ═══════════════════════════════════════════════════════════════════════════
  //  RESET (для тестирования)
  // ═══════════════════════════════════════════════════════════════════════════

  const resetState = useCallback(() => {
    setState(getDefaultState())
  }, [])

  return {
    // State
    points: state.points,
    xp: state.xp,
    level: state.level,
    vouchers: state.vouchers,
    history: state.history,
    dailyBonus: state.dailyBonus,
    missions: state.missions,

    // Computed
    activeVouchers,
    usedVouchers,
    expiredVouchers,
    pendingMissions,
    completedMissions,
    levelProgress,

    // Actions
    addPoints,
    spendPoints,
    addXp,
    redeemReward,
    useVoucher,
    claimDailyBonus,
    completeMission,
    resetState,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildApplyRules(reward: Reward): string {
  const rules: string[] = []

  if (reward.constraints.minOrderAmount) {
    rules.push(`Минимальная сумма заказа: ${reward.constraints.minOrderAmount}₽`)
  }

  if (reward.constraints.maxDiscountPercent) {
    rules.push(`Скидка: ${reward.constraints.maxDiscountPercent}%`)
  }

  if (!reward.constraints.stackable) {
    rules.push('Не суммируется с другими скидками')
  }

  rules.push(`Срок действия: ${reward.constraints.validDays} дней`)

  return rules.join('. ')
}

// Экспорт типа для удобства
export type ClubStateHook = ReturnType<typeof useClubState>

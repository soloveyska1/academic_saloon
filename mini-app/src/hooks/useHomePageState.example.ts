/**
 * Примеры использования useHomePageState hook
 *
 * Этот файл содержит примеры того, как использовать новый hook
 * для управления состоянием HomePage.
 */

import { useHomePageState } from './useHomePageState'

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 1: Базовое использование
// ═══════════════════════════════════════════════════════════════════════════

export function Example1() {
  const { state, actions } = useHomePageState()

  // Доступ к состоянию
  const isCopied = state.copied
  const isQRVisible = state.modals.qr
  const bonusInfo = state.dailyBonus.info

  // Использование действий
  const handleCopy = () => {
    actions.setCopied(true)
    setTimeout(() => actions.setCopied(false), 2000)
  }

  const handleOpenQR = () => {
    actions.openModal('qr')
  }

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 2: Работа с модальными окнами
// ═══════════════════════════════════════════════════════════════════════════

export function Example2() {
  const { state, actions } = useHomePageState()

  // Открыть модалку
  const openCashback = () => actions.openModal('cashback')
  const openGuarantees = () => actions.openModal('guarantees')
  const openTransactions = () => actions.openModal('transactions')

  // Закрыть модалку
  const closeCashback = () => actions.closeModal('cashback')

  // Переключить модалку
  const toggleRanks = () => actions.toggleModal('ranks')

  // Закрыть все модалки
  const closeAll = () => actions.closeAllModals()

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 3: Работа с Daily Bonus
// ═══════════════════════════════════════════════════════════════════════════

export function Example3() {
  const { state, actions } = useHomePageState()

  // Загрузка бонуса
  const loadBonus = async () => {
    actions.setDailyBonusLoading(true)
    try {
      // const info = await fetchDailyBonusInfo()
      // actions.setDailyBonusInfo(info)
      actions.setDailyBonusError(false)
    } catch (error) {
      actions.setDailyBonusError(true)
    } finally {
      actions.setDailyBonusLoading(false)
    }
  }

  // После получения бонуса
  const handleClaim = async () => {
    // const result = await claimDailyBonus()
    // if (result.won) {
    //   actions.setConfetti(true)
    // }
    actions.updateDailyBonusAfterClaim('24ч')
  }

  // Проверка состояния
  const canClaim = state.dailyBonus.info?.can_claim ?? false
  const isLoading = state.dailyBonus.loading
  const hasError = state.dailyBonus.error

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 4: Использование с useEffect
// ═══════════════════════════════════════════════════════════════════════════

export function Example4() {
  const { state, actions } = useHomePageState()

  // useEffect(() => {
  //   // Автоматическое открытие welcome modal для новых пользователей
  //   const isNewUser = true // проверка
  //   if (isNewUser) {
  //     const timer = setTimeout(() => {
  //       actions.openModal('welcome')
  //     }, 1500)
  //     return () => clearTimeout(timer)
  //   }
  // }, [actions])

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 5: Типобезопасное использование
// ═══════════════════════════════════════════════════════════════════════════

export function Example5() {
  const { state, actions } = useHomePageState()

  // TypeScript проверит корректность имени модалки
  const openModal = (modalName: 'qr' | 'cashback' | 'guarantees') => {
    actions.openModal(modalName) // ✅ Корректно
    // actions.openModal('invalid') // ❌ Ошибка TypeScript
  }

  // Автодополнение для state.modals
  const isAnyModalOpen =
    state.modals.qr ||
    state.modals.cashback ||
    state.modals.guarantees ||
    state.modals.transactions ||
    state.modals.ranks ||
    state.modals.welcome ||
    state.modals.urgentSheet ||
    state.modals.dailyBonus

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 6: Использование dispatch напрямую (расширенное)
// ═══════════════════════════════════════════════════════════════════════════

export function Example6() {
  const { state, dispatch } = useHomePageState()

  // Если нужно использовать dispatch напрямую
  const customAction = () => {
    dispatch({ type: 'OPEN_MODAL', payload: 'qr' })
    dispatch({ type: 'SET_COPIED', payload: true })
  }

  // Комплексное действие
  const complexAction = () => {
    // Закрыть все модалки
    dispatch({ type: 'CLOSE_ALL_MODALS' })

    // Показать конфетти
    dispatch({ type: 'SET_CONFETTI', payload: true })

    // Открыть welcome modal
    setTimeout(() => {
      dispatch({ type: 'OPEN_MODAL', payload: 'welcome' })
    }, 500)
  }

  return null // ... JSX
}

// ═══════════════════════════════════════════════════════════════════════════
//  ПРИМЕР 7: Миграция со старого кода
// ═══════════════════════════════════════════════════════════════════════════

export function MigrationExample() {
  // ❌ СТАРЫЙ КОД (useState):
  // const [showQR, setShowQR] = useState(false)
  // const [copied, setCopied] = useState(false)
  // const [dailyBonusInfo, setDailyBonusInfo] = useState(null)

  // ✅ НОВЫЙ КОД (useReducer):
  const { state, actions } = useHomePageState()

  // Замены:
  // showQR → state.modals.qr
  // setShowQR(true) → actions.openModal('qr')
  // setShowQR(false) → actions.closeModal('qr')

  // copied → state.copied
  // setCopied(value) → actions.setCopied(value)

  // dailyBonusInfo → state.dailyBonus.info
  // setDailyBonusInfo(info) → actions.setDailyBonusInfo(info)

  return null // ... JSX
}

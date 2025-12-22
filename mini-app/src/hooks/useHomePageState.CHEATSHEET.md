# useHomePageState - Шпаргалка

## Быстрый старт

```typescript
import { useHomePageState } from '../hooks/useHomePageState'

function MyComponent() {
  const { state, actions } = useHomePageState()

  // Теперь используйте state и actions!
}
```

## State

### UI State
```typescript
state.copied          // boolean - скопирован ли реферальный код
state.showConfetti    // boolean - показывать ли конфетти
```

### Modals
```typescript
state.modals.qr             // boolean - QR код модалка
state.modals.dailyBonus     // boolean - ежедневный бонус
state.modals.cashback       // boolean - кешбэк модалка
state.modals.guarantees     // boolean - гарантии модалка
state.modals.transactions   // boolean - транзакции модалка
state.modals.ranks          // boolean - ранги модалка
state.modals.welcome        // boolean - приветственная модалка
state.modals.urgentSheet    // boolean - срочные задачи
```

### Daily Bonus
```typescript
state.dailyBonus.info      // DailyBonusInfo | null
state.dailyBonus.error     // boolean
state.dailyBonus.loading   // boolean
```

## Actions

### UI Actions
```typescript
actions.setCopied(true)       // установить copied
actions.setConfetti(true)     // показать конфетти
```

### Modal Actions
```typescript
actions.openModal('qr')                  // открыть модалку
actions.closeModal('qr')                 // закрыть модалку
actions.toggleModal('qr')                // переключить модалку
actions.closeAllModals()                 // закрыть все модалки
```

### Daily Bonus Actions
```typescript
actions.setDailyBonusInfo(info)          // установить информацию
actions.setDailyBonusError(true)         // установить ошибку
actions.setDailyBonusLoading(true)       // установить загрузку
actions.updateDailyBonusAfterClaim('24ч') // обновить после получения
```

## Примеры использования

### Открыть/закрыть модалку
```typescript
// Открыть
<button onClick={() => actions.openModal('qr')}>
  Показать QR
</button>

// Закрыть
<Modal
  isOpen={state.modals.qr}
  onClose={() => actions.closeModal('qr')}
/>
```

### Копирование кода
```typescript
const handleCopy = () => {
  navigator.clipboard.writeText(code)
  actions.setCopied(true)
  setTimeout(() => actions.setCopied(false), 2000)
}

{state.copied ? <Check /> : <Copy />}
```

### Загрузка бонуса
```typescript
useEffect(() => {
  const loadBonus = async () => {
    actions.setDailyBonusLoading(true)
    try {
      const info = await fetchDailyBonusInfo()
      actions.setDailyBonusInfo(info)
      actions.setDailyBonusError(false)
    } catch {
      actions.setDailyBonusError(true)
    } finally {
      actions.setDailyBonusLoading(false)
    }
  }
  loadBonus()
}, [actions])
```

### Claim бонуса с конфетти
```typescript
const handleClaim = async () => {
  const result = await claimDailyBonus()
  if (result.won) {
    actions.setConfetti(true)
  }
  actions.updateDailyBonusAfterClaim('24ч')
}
```

## Типы модальных окон

```typescript
type ModalName =
  | 'qr'
  | 'dailyBonus'
  | 'cashback'
  | 'guarantees'
  | 'transactions'
  | 'ranks'
  | 'welcome'
  | 'urgentSheet'
```

## Миграция со старого кода

| Старый код | Новый код |
|------------|-----------|
| `const [showQR, setShowQR] = useState(false)` | `const { state, actions } = useHomePageState()` |
| `showQR` | `state.modals.qr` |
| `setShowQR(true)` | `actions.openModal('qr')` |
| `setShowQR(false)` | `actions.closeModal('qr')` |
| `const [copied, setCopied] = useState(false)` | `const { state, actions } = useHomePageState()` |
| `copied` | `state.copied` |
| `setCopied(true)` | `actions.setCopied(true)` |
| `dailyBonusInfo` | `state.dailyBonus.info` |
| `setDailyBonusInfo(info)` | `actions.setDailyBonusInfo(info)` |

## Расширенное использование

### Прямой доступ к dispatch
```typescript
const { dispatch } = useHomePageState()

dispatch({ type: 'OPEN_MODAL', payload: 'qr' })
dispatch({ type: 'CLOSE_ALL_MODALS' })
```

### Все доступные action types
- `SET_COPIED`
- `SET_CONFETTI`
- `TOGGLE_MODAL`
- `OPEN_MODAL`
- `CLOSE_MODAL`
- `CLOSE_ALL_MODALS`
- `SET_DAILY_BONUS_INFO`
- `SET_DAILY_BONUS_ERROR`
- `SET_DAILY_BONUS_LOADING`
- `UPDATE_DAILY_BONUS_AFTER_CLAIM`

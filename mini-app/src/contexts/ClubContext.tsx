import { createContext, useContext, ReactNode } from 'react'
import { useClubState, ClubStateHook } from '../hooks/useClubState'

// ═══════════════════════════════════════════════════════════════════════════════
//  ClubContext - Глобальный контекст для Клуба Привилегий
// ═══════════════════════════════════════════════════════════════════════════════

const ClubContext = createContext<ClubStateHook | null>(null)

interface ClubProviderProps {
  children: ReactNode
  userId?: number
}

export function ClubProvider({ children, userId }: ClubProviderProps) {
  const clubState = useClubState(userId)

  return (
    <ClubContext.Provider value={clubState}>
      {children}
    </ClubContext.Provider>
  )
}

export function useClub(): ClubStateHook {
  const context = useContext(ClubContext)
  if (!context) {
    throw new Error('useClub должен использоваться внутри ClubProvider')
  }
  return context
}

// Хук для безопасного использования (не выбрасывает ошибку)
export function useClubSafe(): ClubStateHook | null {
  return useContext(ClubContext)
}

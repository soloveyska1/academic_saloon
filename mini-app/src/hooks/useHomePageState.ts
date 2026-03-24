import { useReducer, Dispatch, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  STATE TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface HomePageState {
  // UI State
  copied: boolean
  showConfetti: boolean

  // Modals
  modals: {
    qr: boolean
    cashback: boolean
    guarantees: boolean
    transactions: boolean
    ranks: boolean
    welcome: boolean
    urgentSheet: boolean
    spinWheel: boolean
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ModalName = keyof HomePageState['modals']

export type HomePageAction =
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SET_CONFETTI'; payload: boolean }
  | { type: 'TOGGLE_MODAL'; payload: ModalName }
  | { type: 'OPEN_MODAL'; payload: ModalName }
  | { type: 'CLOSE_MODAL'; payload: ModalName }
  | { type: 'CLOSE_ALL_MODALS' }

// ═══════════════════════════════════════════════════════════════════════════
//  INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

export const initialHomePageState: HomePageState = {
  copied: false,
  showConfetti: false,
  modals: {
    qr: false,
    cashback: false,
    guarantees: false,
    transactions: false,
    ranks: false,
    welcome: false,
    urgentSheet: false,
    spinWheel: false,
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  REDUCER
// ═══════════════════════════════════════════════════════════════════════════

export function homePageReducer(
  state: HomePageState,
  action: HomePageAction
): HomePageState {
  switch (action.type) {
    case 'SET_COPIED':
      return { ...state, copied: action.payload }

    case 'SET_CONFETTI':
      return { ...state, showConfetti: action.payload }

    case 'TOGGLE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: !state.modals[action.payload],
        },
      }

    case 'OPEN_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: true,
        },
      }

    case 'CLOSE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: false,
        },
      }

    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          qr: false,
          cashback: false,
          guarantees: false,
          transactions: false,
          ranks: false,
          welcome: false,
          urgentSheet: false,
          spinWheel: false,
        },
      }

    default:
      return state
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CUSTOM HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseHomePageStateReturn {
  state: HomePageState
  dispatch: Dispatch<HomePageAction>

  // Convenience methods for common actions
  actions: {
    setCopied: (value: boolean) => void
    setConfetti: (value: boolean) => void
    openModal: (modal: ModalName) => void
    closeModal: (modal: ModalName) => void
    toggleModal: (modal: ModalName) => void
    closeAllModals: () => void
  }
}

export function useHomePageState(): UseHomePageStateReturn {
  const [state, dispatch] = useReducer(homePageReducer, initialHomePageState)

  // Memoized action creators to prevent infinite loops in useEffect
  const actions = useMemo(() => ({
    setCopied: (value: boolean) => {
      dispatch({ type: 'SET_COPIED', payload: value })
    },

    setConfetti: (value: boolean) => {
      dispatch({ type: 'SET_CONFETTI', payload: value })
    },

    openModal: (modal: ModalName) => {
      dispatch({ type: 'OPEN_MODAL', payload: modal })
    },

    closeModal: (modal: ModalName) => {
      dispatch({ type: 'CLOSE_MODAL', payload: modal })
    },

    toggleModal: (modal: ModalName) => {
      dispatch({ type: 'TOGGLE_MODAL', payload: modal })
    },

    closeAllModals: () => {
      dispatch({ type: 'CLOSE_ALL_MODALS' })
    },
  }), []) // Empty deps - dispatch is stable from useReducer

  return { state, dispatch, actions }
}

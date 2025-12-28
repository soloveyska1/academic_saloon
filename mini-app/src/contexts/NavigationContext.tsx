import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION CONTEXT — Enhanced with Modal/Sheet Tracking
// ═══════════════════════════════════════════════════════════════════════════
//
//  Функции:
//  1. Управление видимостью навигации
//  2. Отслеживание открытых модалей/sheets
//  3. Автоматическое скрытие навигации при открытии модалей
//  4. Синхронизация с GestureGuard
// ═══════════════════════════════════════════════════════════════════════════

interface NavigationContextType {
    // Основные состояния
    isHidden: boolean
    setHidden: (hidden: boolean) => void

    // Modal tracking
    isModalOpen: boolean
    setModalOpen: (open: boolean) => void

    // Advanced: отслеживание нескольких модалей
    modalCount: number
    registerModal: (id?: string) => () => void

    // Force hide (для определенных страниц)
    forceHide: () => void
    forceShow: () => void
    isForcedHidden: boolean
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [isHidden, setHiddenState] = useState(false)
    const [isForcedHidden, setForcedHidden] = useState(false)
    const [modalCount, setModalCount] = useState(0)
    const activeModalsRef = useRef<Set<string>>(new Set())

    // Computed: any modal is open
    const isModalOpen = modalCount > 0

    const setHidden = useCallback((hidden: boolean) => {
        setHiddenState(hidden)
    }, [])

    // Simple modal open/close (backward compatible)
    const setModalOpen = useCallback((open: boolean) => {
        if (open) {
            setModalCount(prev => prev + 1)
        } else {
            setModalCount(prev => Math.max(0, prev - 1))
        }
    }, [])

    // Advanced: register/unregister modal with optional ID
    const registerModal = useCallback((id?: string) => {
        const modalId = id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Only add if not already registered
        if (!activeModalsRef.current.has(modalId)) {
            activeModalsRef.current.add(modalId)
            setModalCount(activeModalsRef.current.size)
        }

        // Return unregister function
        return () => {
            activeModalsRef.current.delete(modalId)
            setModalCount(activeModalsRef.current.size)
        }
    }, [])

    // Force hide/show for specific pages
    const forceHide = useCallback(() => {
        setForcedHidden(true)
    }, [])

    const forceShow = useCallback(() => {
        setForcedHidden(false)
    }, [])

    // Auto-hide navigation when modals are open
    useEffect(() => {
        if (isModalOpen) {
            setHiddenState(true)
        }
        // Note: We don't auto-show when modals close
        // Navigation will be shown by scroll behavior
    }, [isModalOpen])

    return (
        <NavigationContext.Provider
            value={{
                isHidden,
                setHidden,
                isModalOpen,
                setModalOpen,
                modalCount,
                registerModal,
                forceHide,
                forceShow,
                isForcedHidden
            }}
        >
            {children}
        </NavigationContext.Provider>
    )
}

export function useNavigation() {
    const context = useContext(NavigationContext)
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider')
    }
    return context
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL REGISTRATION HOOK — Для автоматической регистрации модалей
// ═══════════════════════════════════════════════════════════════════════════

export function useModalRegistration(isOpen: boolean, modalId?: string) {
    const { registerModal } = useNavigation()

    useEffect(() => {
        if (!isOpen) return

        const unregister = registerModal(modalId)
        return unregister
    }, [isOpen, modalId, registerModal])
}

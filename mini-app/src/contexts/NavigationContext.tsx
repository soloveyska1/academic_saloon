import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface NavigationContextType {
    isHidden: boolean
    setHidden: (hidden: boolean) => void
    isModalOpen: boolean
    setModalOpen: (open: boolean) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [isHidden, setHiddenState] = useState(false)
    const [isModalOpen, setModalOpenState] = useState(false)

    const setHidden = useCallback((hidden: boolean) => {
        setHiddenState(hidden)
    }, [])

    const setModalOpen = useCallback((open: boolean) => {
        setModalOpenState(open)
    }, [])

    return (
        <NavigationContext.Provider value={{ isHidden, setHidden, isModalOpen, setModalOpen }}>
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

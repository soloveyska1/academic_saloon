import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { canNavigateBackWithinApp } from '../utils/navigation'

export function useSafeBackNavigation(fallbackPath: string) {
  const navigate = useNavigate()

  return useCallback(() => {
    if (canNavigateBackWithinApp()) {
      navigate(-1)
      return
    }

    navigate(fallbackPath)
  }, [fallbackPath, navigate])
}

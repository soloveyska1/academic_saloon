import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNavigation } from '../contexts/NavigationContext'
import { useTelegram } from '../hooks/useUserData'
import {
  canNavigateBackWithinApp,
  getBackFallback,
  rememberAppRoute,
  shouldShowTelegramBackButton,
} from '../utils/navigation'

export function RouteNavigationController() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tg } = useTelegram()
  const { isModalOpen } = useNavigation()

  const fallbackPath = getBackFallback(location.pathname)
  const shouldShowBackButton = shouldShowTelegramBackButton(location.pathname) && !isModalOpen

  const handleBack = useCallback(() => {
    if (canNavigateBackWithinApp()) {
      navigate(-1)
      return
    }

    navigate(fallbackPath)
  }, [fallbackPath, navigate])

  useEffect(() => {
    rememberAppRoute(location.pathname, location.search)
  }, [location.pathname, location.search])

  useEffect(() => {
    const backButton = tg?.BackButton
    if (!backButton) return

    backButton.offClick(handleBack)

    if (shouldShowBackButton) {
      backButton.onClick(handleBack)
      backButton.show()
    } else {
      backButton.hide()
    }

    return () => {
      backButton.offClick(handleBack)
      backButton.hide()
    }
  }, [handleBack, shouldShowBackButton, tg])

  return null
}

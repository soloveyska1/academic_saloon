export const LAST_APP_ROUTE_STORAGE_KEY = 'academic_saloon_last_app_route'

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/god')
}

export function isTopLevelNavigationRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/orders' || pathname === '/club' || pathname === '/profile'
}

export function shouldHideBottomNavigation(pathname: string): boolean {
  return !isTopLevelNavigationRoute(pathname)
}

export function isNavigationItemActive(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/'
  if (path === '/orders') return pathname === '/orders'
  if (path === '/club') return pathname === '/club' || pathname.startsWith('/club/')
  if (path === '/profile') {
    return pathname === '/profile' || pathname === '/referral' || pathname === '/achievements'
  }
  return pathname === path
}

export function getBackFallback(pathname: string): string {
  const orderChatMatch = pathname.match(/^\/order\/(\d+)\/chat$/)
  if (orderChatMatch) {
    return `/order/${orderChatMatch[1]}`
  }

  if (pathname.startsWith('/order/')) return '/orders'
  if (pathname.startsWith('/create-order')) return '/'
  if (pathname.startsWith('/batch-payment')) return '/orders'
  if (pathname.startsWith('/support')) return '/'
  if (pathname.startsWith('/club/')) return '/club'
  if (pathname === '/club') return '/'
  if (pathname === '/referral' || pathname === '/achievements') return '/profile'
  if (pathname.startsWith('/profile')) return '/'
  if (isAdminRoute(pathname)) return getLastAppRoute()

  return '/'
}

export function shouldShowTelegramBackButton(pathname: string): boolean {
  if (isAdminRoute(pathname)) {
    return false
  }

  return !isTopLevelNavigationRoute(pathname)
}

export function rememberAppRoute(pathname: string, search = ''): void {
  if (typeof window === 'undefined' || isAdminRoute(pathname)) return

  try {
    sessionStorage.setItem(LAST_APP_ROUTE_STORAGE_KEY, `${pathname}${search}`)
  } catch {
    // Ignore storage failures
  }
}

export function getLastAppRoute(): string {
  if (typeof window === 'undefined') return '/'

  try {
    const saved = sessionStorage.getItem(LAST_APP_ROUTE_STORAGE_KEY)
    if (!saved || !saved.startsWith('/') || isAdminRoute(saved)) {
      return '/'
    }
    return saved
  } catch {
    return '/'
  }
}

export function canNavigateBackWithinApp(): boolean {
  if (typeof window === 'undefined') return false

  const historyState = window.history.state as { idx?: number; key?: string } | null

  if (typeof historyState?.idx === 'number') {
    return historyState.idx > 0
  }

  return Boolean(historyState?.key && historyState.key !== 'default')
}

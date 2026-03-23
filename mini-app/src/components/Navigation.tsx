import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, List, Crown, User, LucideIcon } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useNavigation } from '../contexts/NavigationContext'
import { isNavigationItemActive, shouldHideBottomNavigation } from '../utils/navigation'

interface NavItem {
  id: string
  path: string
  icon: LucideIcon
  label: string
}

export const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { impactOccurred: haptic } = useHapticFeedback()
  // Context & Scroll State
  const { isHidden, isForcedHidden, isModalOpen } = useNavigation()
  const [isVisible, setIsVisible] = useState(true)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const lastScrollY = useRef(0)
  const initialViewportHeight = useRef(
    typeof window !== 'undefined'
      ? window.visualViewport?.height ?? window.innerHeight
      : 0
  )

  // Pages where nav is completely removed
  const isHiddenPage = shouldHideBottomNavigation(location.pathname)
  const shouldHideNav = isHiddenPage || isHidden || isForcedHidden || isModalOpen || isKeyboardOpen

  // Find the actual scrollable container (HomePage uses overflowY: auto on <main>)
  const getScrollContainer = useCallback((): HTMLElement | null => {
    return document.querySelector('main[role="main"]') as HTMLElement | null
  }, [])

  const scrollToTop = useCallback(() => {
    const container = getScrollContainer()
    if (container && container.scrollTop > 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [getScrollContainer])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const updateKeyboardState = () => {
      const baselineHeight = Math.max(initialViewportHeight.current, window.innerHeight)
      const currentHeight = viewport.height
      setIsKeyboardOpen(baselineHeight - currentHeight > 160)
    }

    updateKeyboardState()
    viewport.addEventListener('resize', updateKeyboardState)

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState)
    }
  }, [])

  // Smart Hide Logic — listens to both window scroll and main container scroll
  useEffect(() => {
    const container = getScrollContainer()

    const handleScroll = () => {
      if (shouldHideNav) {
        setIsVisible(false)
        return
      }

      // Read from whichever is actually scrolling
      const latest = container ? container.scrollTop : window.scrollY
      const diff = latest - lastScrollY.current
      const isScrollingDown = diff > 10
      const isScrollingUp = diff < -10
      const isAtTop = latest < 50

      if (isAtTop) {
        setIsVisible(true)
      } else if (isScrollingDown) {
        setIsVisible(false)
      } else if (isScrollingUp) {
        setIsVisible(true)
      }
      lastScrollY.current = latest
    }

    const target = container || window
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [shouldHideNav, getScrollContainer])

  // Recalculate visibility on location/context change
  useEffect(() => {
    if (shouldHideNav) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
    // Reset scroll tracking on route change
    lastScrollY.current = 0
  }, [location.pathname, shouldHideNav])

  const navItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Главная', path: '/' },
    { id: 'orders', icon: List, label: 'Заказы', path: '/orders' },
    { id: 'club', icon: Crown, label: 'Бонусы', path: '/club' },
    { id: 'profile', icon: User, label: 'Профиль', path: '/profile' }
  ]

  if (shouldHideNav && !isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
            mass: 0.8
          }}
          style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            left: 0,
            right: 0,
            zIndex: 900,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 12px',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            width: 'min(100%, 392px)',
            maxWidth: '100%',
            padding: '8px 10px 10px',
            borderRadius: 28,
            background: 'linear-gradient(180deg, rgba(19, 18, 16, 0.96) 0%, rgba(10, 10, 12, 0.98) 100%)',
            backdropFilter: 'blur(28px) saturate(165%)',
            WebkitBackdropFilter: 'blur(28px) saturate(165%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 30px 70px -34px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.05)',
            pointerEvents: 'auto',
          }}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '0 auto auto 0',
                width: '100%',
                height: 1,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.02) 100%)',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -56,
                right: -10,
                width: 158,
                height: 158,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.05) 38%, transparent 72%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                alignItems: 'stretch',
                gap: 6,
              }}
            >
            {navItems.map((item) => {
              const isActive = isNavigationItemActive(location.pathname, item.path)
              const Icon = item.icon

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  layout
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    haptic(isActive ? 'soft' : 'light')
                    if (isActive && location.pathname === item.path) {
                      scrollToTop()
                      return
                    }

                    navigate(item.path)
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minWidth: 0,
                    width: '100%',
                    height: 74,
                    padding: '8px 6px 10px',
                    borderRadius: 22,
                    border: isActive
                      ? '1px solid rgba(212,175,55,0.22)'
                      : '1px solid transparent',
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(212,175,55,0.17) 0%, rgba(212,175,55,0.07) 100%)'
                      : 'transparent',
                    boxShadow: isActive
                      ? '0 18px 28px -24px rgba(212,175,55,0.44), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : 'none',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navActiveSurface"
                      transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 24,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 34%)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: isActive ? 40 : 38,
                      height: isActive ? 40 : 38,
                      borderRadius: 14,
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.14) 100%)'
                        : 'rgba(255,255,255,0.04)',
                      border: isActive
                        ? '1px solid rgba(212,175,55,0.26)'
                        : '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? '0 10px 22px -16px rgba(212,175,55,0.6)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={isActive ? 21 : 20}
                      strokeWidth={isActive ? 2.1 : 1.95}
                      color={isActive ? 'var(--gold-200)' : 'var(--text-secondary)'}
                    />
                  </motion.div>

                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 0,
                      gap: 3,
                    }}
                  >
                    <motion.span
                      animate={{
                        color: isActive ? 'var(--gold-200)' : 'var(--text-secondary)',
                        opacity: isActive ? 1 : 0.88,
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 600,
                        letterSpacing: isActive ? '0.01em' : '0.005em',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </motion.span>

                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 3 }}
                        style={{
                          width: 18,
                          height: 3,
                          borderRadius: 999,
                          fontWeight: 700,
                          background: 'linear-gradient(90deg, rgba(212,175,55,0.92), rgba(212,175,55,0.3))',
                          boxShadow: '0 0 10px rgba(212,175,55,0.32)',
                        }}
                      />
                    )}
                  </motion.div>
                </motion.button>
              )
            })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

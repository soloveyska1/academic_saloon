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
            left: '50%',
            translateX: '-50%',
            zIndex: 900,
            width: 'min(calc(100vw - 24px), 392px)',
          }}
        >
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '8px',
            borderRadius: 30,
            background: 'linear-gradient(180deg, rgba(19, 18, 16, 0.96) 0%, rgba(10, 10, 12, 0.98) 100%)',
            backdropFilter: 'blur(28px) saturate(165%)',
            WebkitBackdropFilter: 'blur(28px) saturate(165%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 30px 70px -34px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.05)',
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
                display: 'flex',
                alignItems: 'stretch',
                gap: 8,
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
                    alignItems: 'center',
                    justifyContent: isActive ? 'flex-start' : 'center',
                    gap: isActive ? 12 : 6,
                    flex: isActive ? '1.38 1 0' : '0.86 1 0',
                    minWidth: 0,
                    height: 68,
                    padding: isActive ? '0 18px 0 10px' : '0 10px',
                    borderRadius: 24,
                    border: isActive
                      ? '1px solid rgba(212,175,55,0.22)'
                      : '1px solid rgba(255,255,255,0.02)',
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.07) 100%)'
                      : 'transparent',
                    boxShadow: isActive
                      ? '0 20px 34px -24px rgba(212,175,55,0.46), inset 0 1px 0 rgba(255,255,255,0.08)'
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
                      width: isActive ? 42 : 38,
                      height: isActive ? 42 : 38,
                      borderRadius: isActive ? 16 : 14,
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
                      alignItems: isActive ? 'flex-start' : 'center',
                      justifyContent: 'center',
                      minWidth: 0,
                      gap: isActive ? 2 : 4,
                    }}
                  >
                    <motion.span
                      animate={{
                        color: isActive ? 'var(--gold-200)' : 'var(--text-secondary)',
                        opacity: isActive ? 1 : 0.88,
                      }}
                      style={{
                        fontSize: isActive ? 14 : 12,
                        fontWeight: isActive ? 700 : 600,
                        letterSpacing: isActive ? '0.01em' : '0',
                        whiteSpace: 'nowrap',
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
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'rgba(212,175,55,0.72)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Сейчас
                      </motion.span>
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

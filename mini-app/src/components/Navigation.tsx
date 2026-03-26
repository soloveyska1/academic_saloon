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
  const { isHidden, isForcedHidden, showBonusBadge } = useNavigation()
  const [isVisible, setIsVisible] = useState(true)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const lastScrollY = useRef(0)
  const initialViewportHeight = useRef(
    typeof window !== 'undefined'
      ? window.visualViewport?.height ?? window.innerHeight
      : 0
  )

  const isHiddenPage = shouldHideBottomNavigation(location.pathname)
  const shouldHideNav = isHiddenPage || isHidden || isForcedHidden || isKeyboardOpen

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

  useEffect(() => {
    const container = getScrollContainer()

    const handleScroll = () => {
      if (shouldHideNav) {
        setIsVisible(false)
        return
      }

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

  useEffect(() => {
    if (shouldHideNav) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
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
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 280,
          }}
          style={{
            position: 'fixed',
            bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            left: 0,
            right: 0,
            zIndex: 900,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: 'min(92%, 360px)',
            height: 52,
            borderRadius: 9999,
            background: 'rgba(12, 12, 12, 0.92)',
            backdropFilter: 'blur(16px) saturate(120%)',
            WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px -12px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}>
            {navItems.map((item) => {
              const isActive = isNavigationItemActive(location.pathname, item.path)
              const Icon = item.icon

              return (
                <motion.button
                  key={item.id}
                  type="button"
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
                  whileTap={{ scale: 0.92 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    height: 52,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Active dot indicator above icon */}
                  <div style={{ height: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && (
                      <motion.div
                        layoutId="navDot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 24,
                        }}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--gold-400, #C5A028)',
                          boxShadow: '0 0 8px rgba(212,175,55,0.4)',
                        }}
                      />
                    )}
                  </div>

                  {/* Icon */}
                  <motion.div
                    animate={{
                      color: isActive ? 'var(--gold-300, #D4AF37)' : 'rgba(255,255,255,0.4)',
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.0 : 1.6}
                      color={isActive ? 'var(--gold-300, #D4AF37)' : 'rgba(255,255,255,0.4)'}
                    />
                    {/* Gold notification dot — only when daily bonus is claimable */}
                    {item.path === '/club' && !isActive && showBonusBadge && (
                      <div style={{
                        position: 'absolute',
                        top: -2,
                        right: -4,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#D4AF37',
                        boxShadow: '0 0 6px rgba(212,175,55,0.5)',
                      }} />
                    )}
                  </motion.div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 600,
                      letterSpacing: '0.02em',
                      color: isActive ? 'var(--gold-300, #D4AF37)' : 'rgba(255,255,255,0.35)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

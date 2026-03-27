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

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Главная', path: '/' },
  { id: 'orders', icon: List, label: 'Заказы', path: '/orders' },
  { id: 'club', icon: Crown, label: 'Бонусы', path: '/club' },
  { id: 'profile', icon: User, label: 'Профиль', path: '/profile' },
]

/* ── Spring presets ─────────────────────────────────────────────── */
const springNav   = { type: 'spring' as const, damping: 24, stiffness: 300 }
const springPill  = { type: 'spring' as const, damping: 26, stiffness: 320 }
const springIcon  = { type: 'spring' as const, damping: 28, stiffness: 400 }
const springTap   = { type: 'spring' as const, damping: 30, stiffness: 500 }

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

  /* ── Keyboard detection ───────────────────────────────────────── */
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
    return () => viewport.removeEventListener('resize', updateKeyboardState)
  }, [])

  /* ── Scroll hide/show ─────────────────────────────────────────── */
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

  /* ── Route change → reset ─────────────────────────────────────── */
  useEffect(() => {
    if (shouldHideNav) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
    lastScrollY.current = 0
  }, [location.pathname, shouldHideNav])

  if (shouldHideNav && !isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={springNav}
          role="navigation"
          aria-label="Основная навигация"
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
          {/* ── Capsule container ──────────────────────────────────── */}
          <div
            role="tablist"
            style={{
              position: 'relative',
              width: 'min(92%, 360px)',
              height: 58,
              borderRadius: 9999,
              background: 'rgba(14, 13, 12, 0.88)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              boxShadow: [
                '0 8px 32px -8px rgba(0, 0, 0, 0.4)',
                '0 4px 16px -4px rgba(212, 175, 55, 0.05)',
                'inset 0 0.5px 0 rgba(255, 255, 255, 0.06)',
              ].join(', '),
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              pointerEvents: 'auto',
              overflow: 'hidden',
            }}
          >
            {/* ── Gold edge light (top highlight) ─────────────────── */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.15), transparent)',
                pointerEvents: 'none',
              }}
            />

            {navItems.map((item) => {
              const isActive = isNavigationItemActive(location.pathname, item.path)
              const Icon = item.icon

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-label={item.label}
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    haptic(isActive ? 'soft' : 'light')
                    if (isActive && location.pathname === item.path) {
                      scrollToTop()
                      return
                    }
                    navigate(item.path)
                  }}
                  whileTap={{ scale: 0.94 }}
                  transition={springTap}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    height: 58,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* ── Sliding active pill (the WOW feature) ─────── */}
                  {isActive && (
                    <motion.div
                      layoutId="navActivePill"
                      transition={springPill}
                      style={{
                        position: 'absolute',
                        top: 7,
                        bottom: 7,
                        left: 10,
                        right: 10,
                        borderRadius: 18,
                        background: 'rgba(212, 175, 55, 0.10)',
                        border: '1px solid rgba(212, 175, 55, 0.08)',
                        boxShadow: '0 0 12px rgba(212, 175, 55, 0.06)',
                      }}
                    />
                  )}

                  {/* ── Active bar indicator (top) ────────────────── */}
                  <div style={{ height: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && (
                      <motion.div
                        layoutId="navActiveBar"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={springIcon}
                        style={{
                          width: 20,
                          height: 2.5,
                          borderRadius: 2,
                          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.6), var(--gold-400, #D4AF37), rgba(212, 175, 55, 0.6))',
                          boxShadow: '0 0 8px rgba(212, 175, 55, 0.35)',
                        }}
                      />
                    )}
                  </div>

                  {/* ── Icon ───────────────────────────────────────── */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.06 : 1,
                      filter: isActive
                        ? 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.25))'
                        : 'drop-shadow(0 0 0px transparent)',
                    }}
                    transition={springIcon}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon
                      size={isActive ? 22 : 20}
                      strokeWidth={isActive ? 2.2 : 1.5}
                      color={isActive ? 'var(--gold-400, #D4AF37)' : 'rgba(255, 255, 255, 0.45)'}
                      style={{ transition: 'color 0.2s ease-out' }}
                    />

                    {/* ── Bonus notification badge with pulse ──────── */}
                    {item.path === '/club' && !isActive && showBonusBadge && (
                      <div style={{
                        position: 'absolute',
                        top: -2,
                        right: -4,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#D4AF37',
                        boxShadow: '0 0 6px rgba(212, 175, 55, 0.5)',
                      }}>
                        {/* Pulse ring */}
                        <motion.div
                          animate={{
                            scale: [1, 2, 2],
                            opacity: [0.6, 0, 0],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '1px solid #D4AF37',
                          }}
                        />
                      </div>
                    )}
                  </motion.div>

                  {/* ── Label ──────────────────────────────────────── */}
                  <motion.span
                    animate={{
                      color: isActive ? 'var(--gold-400, #D4AF37)' : 'rgba(255, 255, 255, 0.42)',
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

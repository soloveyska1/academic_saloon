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
  { id: 'club', icon: Crown, label: 'Клуб', path: '/club' },
  { id: 'profile', icon: User, label: 'Профиль', path: '/profile' },
]

const springNav  = { type: 'spring' as const, damping: 22, stiffness: 260 }
const springPill = { type: 'spring' as const, damping: 22, stiffness: 280 }
const springIcon = { type: 'spring' as const, damping: 24, stiffness: 350 }

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
      setIsKeyboardOpen(baselineHeight - viewport.height > 160)
    }
    updateKeyboardState()
    viewport.addEventListener('resize', updateKeyboardState)
    return () => viewport.removeEventListener('resize', updateKeyboardState)
  }, [])

  useEffect(() => {
    const container = getScrollContainer()
    const handleScroll = () => {
      if (shouldHideNav) { setIsVisible(false); return }
      const latest = container ? container.scrollTop : window.scrollY
      const diff = latest - lastScrollY.current
      if (latest < 50) setIsVisible(true)
      else if (diff > 10) setIsVisible(false)
      else if (diff < -10) setIsVisible(true)
      lastScrollY.current = latest
    }
    const target = container || window
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [shouldHideNav, getScrollContainer])

  useEffect(() => {
    setIsVisible(!shouldHideNav)
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
          {/* ── Capsule ───────────────────────────────────────────── */}
          <div
            role="tablist"
            style={{
              position: 'relative',
              width: 'min(92%, 360px)',
              height: 64,
              borderRadius: 9999,
              background: 'linear-gradient(180deg, rgba(22, 20, 16, 0.95), rgba(10, 10, 10, 0.98))',
              backdropFilter: 'blur(24px) saturate(150%)',
              WebkitBackdropFilter: 'blur(24px) saturate(150%)',
              border: '1px solid rgba(212, 175, 55, 0.12)',
              boxShadow: [
                '0 8px 32px rgba(0, 0, 0, 0.5)',
                '0 2px 12px rgba(212, 175, 55, 0.06)',
                'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              ].join(', '),
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              pointerEvents: 'auto',
              overflow: 'hidden',
            }}
          >
            {/* Top gold reflection line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.35) 30%, rgba(255,248,214,0.25) 50%, rgba(212,175,55,0.35) 70%, transparent 100%)',
              pointerEvents: 'none',
            }} />

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
                  whileTap={{ scale: 0.9 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    height: 64,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* ═══ ACTIVE PILL — clearly visible gold backdrop ═══ */}
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      transition={springPill}
                      style={{
                        position: 'absolute',
                        top: 5,
                        bottom: 5,
                        left: 6,
                        right: 6,
                        borderRadius: 22,
                        background: 'radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.08) 100%)',
                        border: '1px solid rgba(212, 175, 55, 0.18)',
                        boxShadow: [
                          '0 0 20px rgba(212, 175, 55, 0.12)',
                          '0 0 40px rgba(212, 175, 55, 0.05)',
                          'inset 0 1px 0 rgba(255, 248, 214, 0.12)',
                        ].join(', '),
                      }}
                    />
                  )}

                  {/* ═══ ICON CONTAINER ═══ */}
                  <motion.div
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={springIcon}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 1,
                      width: 36,
                      height: 30,
                    }}
                  >
                    {/* Radial gold glow behind active icon */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.3 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.3 }}
                          transition={{ duration: 0.35 }}
                          style={{
                            position: 'absolute',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.30) 0%, rgba(212, 175, 55, 0.08) 50%, transparent 70%)',
                          }}
                        />
                      )}
                    </AnimatePresence>

                    <Icon
                      size={isActive ? 24 : 21}
                      strokeWidth={isActive ? 2.4 : 1.5}
                      color={isActive ? '#E8C547' : 'rgba(255, 255, 255, 0.35)'}
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                        filter: isActive
                          ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5)) drop-shadow(0 0 3px rgba(255, 248, 214, 0.3))'
                          : 'none',
                      }}
                    />

                    {/* Bonus badge */}
                    {item.path === '/club' && !isActive && showBonusBadge && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D4AF37, #FFF8D6)',
                        boxShadow: '0 0 8px rgba(212, 175, 55, 0.7)',
                        border: '1.5px solid rgba(10, 10, 10, 0.95)',
                      }}>
                        <motion.div
                          animate={{ scale: [1, 2.2, 2.2], opacity: [0.8, 0, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                          style={{
                            position: 'absolute',
                            inset: -1,
                            borderRadius: '50%',
                            border: '1.5px solid rgba(212, 175, 55, 0.7)',
                          }}
                        />
                      </div>
                    )}
                  </motion.div>

                  {/* ═══ LABEL ═══ */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      position: 'relative',
                      zIndex: 1,
                      color: isActive ? '#E8C547' : 'rgba(255, 255, 255, 0.35)',
                      textShadow: isActive ? '0 0 16px rgba(212, 175, 55, 0.45)' : 'none',
                      transition: 'all 0.3s ease-out',
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

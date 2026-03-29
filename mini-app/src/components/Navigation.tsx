import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
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
const springNav  = { type: 'spring' as const, damping: 22, stiffness: 260 }
const springPill = { type: 'spring' as const, damping: 24, stiffness: 300 }
const springIcon = { type: 'spring' as const, damping: 26, stiffness: 380 }
const springTap  = { type: 'spring' as const, damping: 30, stiffness: 500 }

/* ── Capsule styles (static, no re-creation on render) ──────────── */
const capsuleStyle: React.CSSProperties = {
  position: 'relative',
  width: 'min(92%, 360px)',
  height: 62,
  borderRadius: 9999,
  background: 'linear-gradient(135deg, rgba(18, 16, 12, 0.94), rgba(10, 10, 10, 0.96))',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid rgba(212, 175, 55, 0.09)',
  boxShadow: [
    '0 12px 40px -8px rgba(0, 0, 0, 0.55)',
    '0 4px 20px -4px rgba(212, 175, 55, 0.08)',
    'inset 0 1px 0 rgba(255, 255, 255, 0.07)',
    'inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
  ].join(', '),
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  pointerEvents: 'auto' as const,
  overflow: 'hidden',
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

  /* ── Ambient glow intensity: tracks active index for glow position ─ */
  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex(item => isNavigationItemActive(location.pathname, item.path))
    return idx >= 0 ? idx : 0
  }, [location.pathname])

  const glowX = useMotionValue(activeIndex * 25 + 12.5)

  useEffect(() => {
    animate(glowX, activeIndex * 25 + 12.5, {
      type: 'spring', damping: 28, stiffness: 200,
    })
  }, [activeIndex, glowX])

  const glowGradient = useTransform(
    glowX,
    [0, 100],
    [
      'radial-gradient(ellipse 80px 40px at 0% 100%, rgba(212,175,55,0.12), transparent)',
      'radial-gradient(ellipse 80px 40px at 100% 100%, rgba(212,175,55,0.12), transparent)',
    ]
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
          {/* ── Ambient gold glow UNDER the capsule ───────────────── */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '15%',
              right: '15%',
              height: 32,
              background: glowGradient,
              filter: 'blur(16px)',
              pointerEvents: 'none',
              opacity: 0.7,
            }}
          />

          {/* ── Capsule container ──────────────────────────────────── */}
          <div role="tablist" style={capsuleStyle}>

            {/* ── Top edge light — gold reflection ────────────────── */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), rgba(255, 248, 214, 0.15), rgba(212, 175, 55, 0.25), transparent)',
              pointerEvents: 'none',
            }} />

            {/* ── Bottom inner edge — depth ───────────────────────── */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '20%',
              right: '20%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent)',
              pointerEvents: 'none',
            }} />

            {/* ── Noise texture overlay ───────────────────────────── */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 9999,
              backgroundImage: 'var(--noise-overlay)',
              opacity: 0.4,
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
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
                  whileTap={{ scale: 0.92 }}
                  transition={springTap}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    height: 62,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* ═══ ACTIVE PILL — liquid gold backdrop ═══ */}
                  {isActive && (
                    <motion.div
                      layoutId="navActivePill"
                      transition={springPill}
                      style={{
                        position: 'absolute',
                        top: 6,
                        bottom: 6,
                        left: 8,
                        right: 8,
                        borderRadius: 20,
                        background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.14), rgba(212, 175, 55, 0.06))',
                        border: '1px solid rgba(212, 175, 55, 0.12)',
                        boxShadow: [
                          '0 0 16px rgba(212, 175, 55, 0.10)',
                          'inset 0 1px 0 rgba(255, 248, 214, 0.08)',
                          'inset 0 -1px 0 rgba(212, 175, 55, 0.04)',
                        ].join(', '),
                      }}
                    />
                  )}

                  {/* ═══ ACTIVE TOP BAR — molten gold accent ═══ */}
                  <div style={{
                    height: 3,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}>
                    {isActive && (
                      <motion.div
                        layoutId="navActiveBar"
                        transition={springIcon}
                        style={{
                          width: 24,
                          height: 3,
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #B38728, #D4AF37, #FFF8D6, #D4AF37, #B38728)',
                          boxShadow: '0 0 10px rgba(212, 175, 55, 0.5), 0 0 20px rgba(212, 175, 55, 0.2)',
                        }}
                      />
                    )}
                  </div>

                  {/* ═══ ICON — with glow ring on active ═══ */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.12 : 1,
                    }}
                    transition={springIcon}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 1,
                      width: 32,
                      height: 32,
                    }}
                  >
                    {/* Gold glow behind active icon */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{
                          position: 'absolute',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.20) 0%, rgba(212, 175, 55, 0) 70%)',
                          filter: 'blur(2px)',
                        }}
                      />
                    )}

                    <Icon
                      size={isActive ? 23 : 20}
                      strokeWidth={isActive ? 2.3 : 1.4}
                      color={isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.40)'}
                      style={{
                        transition: 'color 0.25s ease-out, stroke-width 0.25s ease-out',
                        filter: isActive
                          ? 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.4)) drop-shadow(0 0 2px rgba(255, 248, 214, 0.2))'
                          : 'none',
                      }}
                    />

                    {/* ── Bonus notification badge with pulse ──────── */}
                    {item.path === '/club' && !isActive && showBonusBadge && (
                      <div style={{
                        position: 'absolute',
                        top: 1,
                        right: 1,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D4AF37, #FFF8D6)',
                        boxShadow: '0 0 8px rgba(212, 175, 55, 0.6), 0 0 3px rgba(255, 248, 214, 0.4)',
                        border: '1px solid rgba(14, 13, 12, 0.9)',
                      }}>
                        {/* Pulse ring 1 */}
                        <motion.div
                          animate={{
                            scale: [1, 2.5, 2.5],
                            opacity: [0.7, 0, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                          style={{
                            position: 'absolute',
                            inset: -1,
                            borderRadius: '50%',
                            border: '1.5px solid rgba(212, 175, 55, 0.6)',
                          }}
                        />
                        {/* Pulse ring 2 — staggered */}
                        <motion.div
                          animate={{
                            scale: [1, 2.5, 2.5],
                            opacity: [0.5, 0, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: 0.8,
                          }}
                          style={{
                            position: 'absolute',
                            inset: -1,
                            borderRadius: '50%',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                          }}
                        />
                      </div>
                    )}
                  </motion.div>

                  {/* ═══ LABEL ═══ */}
                  <motion.span
                    animate={{
                      color: isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.38)',
                    }}
                    transition={{ duration: 0.25 }}
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: isActive ? '0.03em' : '0.01em',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      position: 'relative',
                      zIndex: 1,
                      textShadow: isActive
                        ? '0 0 12px rgba(212, 175, 55, 0.3)'
                        : 'none',
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

import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, List, Crown, User, LucideIcon } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useNavigation } from '../contexts/NavigationContext'
import { isNavigationItemActive, shouldHideBottomNavigation } from '../utils/navigation'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ISLAND NAVIGATION — "The Floating Command Center"
//  Features: Dynamic Island animations, Deep Glassmorphism, Perfect Z-Index
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM NAVIGATION - "FLOATING GLASS COMMAND CENTER"
//  Features: Magnetic Buttons, Spotlight Active State, Smart Hide
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  id: string
  path: string
  icon: LucideIcon
  label: string
}

function MagneticItem({
  children,
  onClick,
  isActive,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  isActive: boolean
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    const x = (clientX - (left + width / 2)) * 0.3 // Pull strength
    const y = (clientY - (top + height / 2)) * 0.3
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      role="button"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        cursor: 'pointer',
        position: 'relative',
        zIndex: 2,
        // Small tap shrink
      }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.div>
  )
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

  // Find active index for spotlight
  const activeIndex = navItems.findIndex(item => isNavigationItemActive(location.pathname, item.path))

  // Theme-aware colors
  const goldAccent = 'var(--gold-400)'
  const inactiveIconColor = 'var(--text-muted)'
  const inactiveLabelColor = 'var(--text-secondary)'

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
            width: 'auto',
          }}
        >
          {/* Dynamic Island Capsule */}
          <div style={{
            background: 'var(--nav-capsule-bg)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            borderRadius: '100px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>



            {navItems.map((item) => {
              const isActive = isNavigationItemActive(location.pathname, item.path)
              const Icon = item.icon

              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Active Spotlight (The "Pill") */}
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      style={{
                        position: 'absolute',
                        inset: 6,
                        borderRadius: '50px',
                        background: 'var(--nav-pill-bg)',
                        boxShadow: 'var(--nav-glow)',
                        border: 'none',
                        zIndex: 0
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <MagneticItem
                    isActive={isActive}
                    label={item.label}
                    onClick={() => {
                      haptic(isActive ? 'soft' : 'light')
                      if (isActive && location.pathname === item.path) {
                        scrollToTop()
                        return
                      }

                      navigate(item.path)
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: isActive ? 1.05 : 1,
                        color: isActive ? goldAccent : inactiveIconColor
                      }}
                    >
                      <Icon
                        size={24}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        fill="none"
                      />
                    </motion.div>

                    <motion.span
                      animate={{
                        opacity: isActive ? 1 : 0.72,
                        y: isActive ? 0 : 1,
                        color: isActive ? goldAccent : inactiveLabelColor
                      }}
                      style={{
                        fontSize: 10,
                        fontWeight: isActive ? 600 : 500,
                        letterSpacing: '0.02em',
                        marginTop: 3,
                      }}
                    >
                      {item.label}
                    </motion.span>
                  </MagneticItem>
                </div>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

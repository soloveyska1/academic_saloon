import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { Home, List, Crown, User, LucideIcon } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useNavigation } from '../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ISLAND NAVIGATION — "The Floating Command Center"
//  Features: Dynamic Island animations, Deep Glassmorphism, Perfect Z-Index
// ═══════════════════════════════════════════════════════════════════════════

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
  // Global control from Context
  const { isHidden: isForcedHidden, isModalOpen } = useNavigation()

  // Local scroll state
  const { scrollY } = useScroll()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Pages where nav is completely removed (Order Chat, etc)
  const isHiddenPage = ['/order/', '/create-order', '/support'].some(path => location.pathname.startsWith(path)) && location.pathname !== '/orders'

  // Smart Hide Logic
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (isHiddenPage || isForcedHidden || isModalOpen) {
      if (isVisible) setIsVisible(false)
      return
    }

    const diff = latest - lastScrollY.current
    const isScrollingDown = diff > 8 // Sensitivity
    const isScrollingUp = diff < -8
    const isAtTop = latest < 50

    if (isAtTop) {
      setIsVisible(true)
    } else if (isScrollingDown && isVisible) {
      setIsVisible(false)
    } else if (isScrollingUp && !isVisible) {
      setIsVisible(true)
    }
    lastScrollY.current = latest
  })

  // Recalculate visibility when context/route changes
  useEffect(() => {
    if (isHiddenPage || isForcedHidden || isModalOpen) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [isHiddenPage, isForcedHidden, isModalOpen])

  // Keyboard detection
  useEffect(() => {
    const handleResize = () => {
      if (!window.visualViewport) return
      const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75
      // If keyboard open, hide.
      if (isKeyboardOpen) setIsVisible(false)
      // If keyboard closed, restore ONLY if context allows
      else if (!isHiddenPage && !isForcedHidden && !isModalOpen) setIsVisible(true)
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [isHiddenPage, isForcedHidden, isModalOpen])

  const navItems = [
    { id: 'home', icon: Home, label: 'Главная', path: '/' },
    { id: 'orders', icon: List, label: 'Заказы', path: '/orders' },
    { id: 'club', icon: Crown, label: 'Клуб', path: '/club' },
    { id: 'profile', icon: User, label: 'Профиль', path: '/profile' }
  ]

  // If forced hidden by page logic (not just scroll), don't render or keep hidden
  if (isHiddenPage && !isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
            mass: 0.8
          }}
          style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            left: '50%',
            translateX: '-50%',
            zIndex: 900, // Higher z-index to stay above some elements, but below modals (1000)
            width: 'auto',
            minWidth: '300px'
          }}
        >
          {/* Dynamic Island Capsule */}
          <div style={{
            background: 'rgba(20, 20, 23, 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '100px',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), 0 0 20px -5px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden' // Clip internal effects
          }}>
            {/* Glossy top highlight */}
            <div style={{
              position: 'absolute',
              top: 0, left: 20, right: 20, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              zIndex: 1
            }} />

            {/* Bottom Gold Glow */}
            <div style={{
              position: 'absolute',
              bottom: -10, left: '20%', right: '20%', height: 20,
              background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, transparent 70%)',
              filter: 'blur(10px)',
              zIndex: 0
            }} />

            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    haptic('light')
                    navigate(item.path)
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    position: 'relative', // For active scale
                    zIndex: 2,
                    minWidth: 48
                  }}
                >
                  {/* Icon Wrapper for Animation */}
                  <motion.div
                    animate={{
                      y: isActive ? -2 : 0,
                      scale: isActive ? 1.1 : 1,
                      color: isActive ? '#D4AF37' : 'rgba(161, 161, 170, 0.8)'
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0.6,
                      color: isActive ? '#D4AF37' : '#71717a',
                      fontWeight: isActive ? 600 : 500
                    }}
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.02em'
                    }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Active Indicator Dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      style={{
                        position: 'absolute',
                        bottom: -12, // Below the item
                        width: 20,
                        height: 3,
                        borderRadius: '2px 2px 0 0',
                        background: '#D4AF37',
                        boxShadow: '0 -2px 10px rgba(212,175,55,0.5)'
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
